IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'EventTicketing')
BEGIN
    CREATE DATABASE EventTicketing;
END
GO
USE EventTicketing;
GO

-- =========================================
-- Clean up Tables, Procedures and Functions
-- =========================================
DROP TABLE IF EXISTS SeatTransaction;
DROP TABLE IF EXISTS Ticket;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Seat;
DROP TABLE IF EXISTS SeatType;
DROP TABLE IF EXISTS Event;
DROP TABLE IF EXISTS [User];
GO

DROP PROCEDURE IF EXISTS CreateEvent;
DROP PROCEDURE IF EXISTS UpdateEvent;
DROP PROCEDURE IF EXISTS DeleteEvent;
DROP PROCEDURE IF EXISTS GetAllEvents;
DROP PROCEDURE IF EXISTS GetEventById;
DROP FUNCTION IF EXISTS GetUpcomingEvents;
DROP FUNCTION IF EXISTS GetEventSeatMap;
DROP PROCEDURE IF EXISTS GetEventDetails;
DROP PROCEDURE IF EXISTS SearchEvents;

DROP PROCEDURE IF EXISTS RegisterUser;
DROP PROCEDURE IF EXISTS LoginUser;

DROP PROCEDURE IF EXISTS CreateSeat;
DROP PROCEDURE IF EXISTS UpdateSeat;
DROP PROCEDURE IF EXISTS DeleteSeat;
DROP PROCEDURE IF EXISTS GetAllSeats;
DROP PROCEDURE IF EXISTS GetSeatById;
DROP PROCEDURE IF EXISTS GetSeatsByEventId;

DROP PROCEDURE IF EXISTS CreateSeatType;
DROP PROCEDURE IF EXISTS UpdateSeatType;
DROP PROCEDURE IF EXISTS DeleteSeatType;
DROP PROCEDURE IF EXISTS AssignSeatTypeByRectangle;
DROP PROCEDURE IF EXISTS GetAllSeatTypes;
DROP PROCEDURE IF EXISTS GetSeatTypeById;
DROP PROCEDURE IF EXISTS GetSeatTypesByEventId;

DROP PROCEDURE IF EXISTS HoldSeats;
DROP PROCEDURE IF EXISTS ConfirmPurchase;
DROP PROCEDURE IF EXISTS ReleaseExpiredHolds;
DROP PROCEDURE IF EXISTS CancelTicket;

DROP FUNCTION IF EXISTS ViewPurchasedTickets;
DROP FUNCTION IF EXISTS GetSeatTransactions;

DROP PROCEDURE IF EXISTS GetAllPayments;
DROP PROCEDURE IF EXISTS GetPaymentById;

DROP TYPE IF EXISTS dbo.GuidList;
GO

-- =========================
-- Tables
-- =========================

CREATE TABLE [User] (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL,
    userName NVARCHAR(100) UNIQUE NOT NULL,
    password NVARCHAR(100) NOT NULL,
    role NVARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'))
);

CREATE TABLE Event (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(200) NOT NULL,
    status NVARCHAR(50),
    address NVARCHAR(255),
    event_date DATETIME NOT NULL,
    rows INT,
    columns INT,
    available_seats INT DEFAULT 0,
    organizer_id UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT FK_Event_Organizer FOREIGN KEY (organizer_id) REFERENCES [User](id),
    CONSTRAINT CK_Event_Status CHECK (status IN ('DRAFT', 'PENDING' ,'VERIFY', 'PUBLISHED', 'CANCELLED'))
);

CREATE TABLE SeatType (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    event_id UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT FK_SeatType_Event FOREIGN KEY (event_id) REFERENCES Event(id),
    CONSTRAINT UQ_SeatType_Event_Name UNIQUE (event_id, name)
);

CREATE TABLE Seat (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    x_coordinate INT NOT NULL,
    y_coordinate INT NOT NULL,
    seat_type_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(50) NOT NULL,
    hold_expires_at DATETIME NULL,
    CONSTRAINT FK_Seat_Event FOREIGN KEY (event_id) REFERENCES Event(id),
    CONSTRAINT FK_Seat_SeatType FOREIGN KEY (seat_type_id) REFERENCES SeatType(id),
    CONSTRAINT FK_Seat_User FOREIGN KEY (user_id) REFERENCES [User](id),
    CONSTRAINT CK_Seat_Status CHECK (status IN ('AVAILABLE', 'BOOKED', 'ON_HOLD')),
    CONSTRAINT UQ_Seat_UniquePosition UNIQUE (event_id, x_coordinate, y_coordinate)
);

CREATE TABLE Payment (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATETIME NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    method NVARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES [User](id),
    CONSTRAINT CK_Payment_Method CHECK (method in ('CREDIT_CARD', 'CASH', 'BANK_TRANSFER', 'E_WALLET'))
);

CREATE TABLE Ticket (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    seat_id UNIQUEIDENTIFIER NOT NULL,
    payment_id UNIQUEIDENTIFIER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status NVARCHAR(20) DEFAULT 'VALID',
    CONSTRAINT FK_Ticket_Seat FOREIGN KEY (seat_id) REFERENCES Seat(id),
    CONSTRAINT FK_Ticket_Payment FOREIGN KEY (payment_id) REFERENCES Payment(id),
    CONSTRAINT CK_Ticket_Status CHECK (status IN ('VALID', 'REFUNDED'))
);

CREATE TABLE SeatTransaction (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    seat_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(20) NOT NULL,
    ticket_id UNIQUEIDENTIFIER NULL,
    created_at DATETIME DEFAULT GETUTCDATE(),
    CONSTRAINT FK_SeatTransaction_Seat FOREIGN KEY (seat_id) REFERENCES Seat(id),
    CONSTRAINT FK_SeatTransaction_User FOREIGN KEY (user_id) REFERENCES [User](id),
    CONSTRAINT FK_SeatTransaction_Ticket FOREIGN KEY (ticket_id) REFERENCES Ticket(id)
);
GO

-- =========================
-- Types
-- =========================
CREATE TYPE dbo.GuidList AS TABLE (
    id UNIQUEIDENTIFIER NOT NULL
);
GO

-- =========================
-- Triggers
-- =========================

CREATE TRIGGER TR_Seat_MaintainAvailableSeats
    ON Seat
    AFTER INSERT, UPDATE, DELETE
    AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @DeltaTable TABLE (event_id UNIQUEIDENTIFIER, delta INT);
    INSERT INTO @DeltaTable (event_id, delta)
    SELECT event_id, 1 FROM inserted WHERE status = 'AVAILABLE';
    INSERT INTO @DeltaTable (event_id, delta)
    SELECT event_id, -1 FROM deleted WHERE status = 'AVAILABLE';
    WITH Updates AS (
        SELECT event_id, SUM(delta) as change FROM @DeltaTable GROUP BY event_id
    )
    UPDATE e
    SET available_seats = ISNULL(e.available_seats, 0) + u.change
    FROM Event e JOIN Updates u ON e.id = u.event_id;
END;
GO

CREATE TRIGGER TR_Event_Verify_GenerateSeats
    ON Event
    AFTER UPDATE
    AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EventsToProcess TABLE (id UNIQUEIDENTIFIER, rows INT, columns INT);
    INSERT INTO @EventsToProcess (id, rows, columns)
    SELECT i.id, i.rows, i.columns FROM inserted i JOIN deleted d ON i.id = d.id WHERE i.status = 'VERIFY' AND d.status <> 'VERIFY';
    DELETE FROM @EventsToProcess WHERE id IN (SELECT event_id FROM Seat);
    IF NOT EXISTS (SELECT 1 FROM @EventsToProcess) RETURN;
    DECLARE @EventId UNIQUEIDENTIFIER, @Rows INT, @Cols INT;
    DECLARE event_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT id, rows, columns FROM @EventsToProcess;
    OPEN event_cursor;
    FETCH NEXT FROM event_cursor INTO @EventId, @Rows, @Cols;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @SeatTypeId UNIQUEIDENTIFIER = NEWID();
        INSERT INTO SeatType (id, name, price, event_id) VALUES (@SeatTypeId, 'DEFAULT SEAT', 0, @EventId);
        WITH
            L0 AS (SELECT c FROM (VALUES(1),(1)) AS D(c)),
            L1 AS (SELECT 1 AS c FROM L0 AS A CROSS JOIN L0 AS B),
            L2 AS (SELECT 1 AS c FROM L1 AS A CROSS JOIN L1 AS B),
            L3 AS (SELECT 1 AS c FROM L2 AS A CROSS JOIN L2 AS B),
            L4 AS (SELECT 1 AS c FROM L3 AS A CROSS JOIN L3 AS B),
            Nums AS (SELECT ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) AS n FROM L4)
        INSERT INTO Seat (id, event_id, x_coordinate, y_coordinate, seat_type_id, status)
        SELECT NEWID(), @EventId, C.n, R.n, @SeatTypeId, 'AVAILABLE'
        FROM Nums R CROSS JOIN Nums C WHERE R.n <= @Rows AND C.n <= @Cols;
        FETCH NEXT FROM event_cursor INTO @EventId, @Rows, @Cols;
    END
    CLOSE event_cursor; DEALLOCATE event_cursor;
END;
GO

-- =========================
-- User Procedures
-- =========================

CREATE PROCEDURE RegisterUser
    @name NVARCHAR(100), @userName NVARCHAR(100), @password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM [User] WHERE userName = @userName) THROW 50001, 'Username already exists.', 1;
    INSERT INTO [User] (name, userName, password) VALUES (@name, @userName, @password);
    SELECT id, name, userName, role FROM [User] WHERE userName = @userName;
END;
GO

CREATE PROCEDURE LoginUser
    @userName NVARCHAR(100), @password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, name, userName, role FROM [User] WHERE userName = @userName AND password = @password;
END;
GO

-- =========================
-- Event Procedures
-- =========================

CREATE PROCEDURE CreateEvent
    @name NVARCHAR(200), @address NVARCHAR(255), @event_date DATETIME, @rows INT, @columns INT, @organizer_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id UNIQUEIDENTIFIER = NEWID();
    INSERT INTO Event (id, name, status, address, event_date, rows, columns, organizer_id)
    VALUES (@id, @name, 'DRAFT', @address, @event_date, @rows, @columns, @organizer_id);
    SELECT * FROM Event WHERE id = @id;
END;
GO

CREATE PROCEDURE UpdateEvent
    @id UNIQUEIDENTIFIER, @name NVARCHAR(200) = NULL, @status NVARCHAR(50) = NULL, @address NVARCHAR(255) = NULL, @event_date DATETIME = NULL, @rows INT = NULL, @columns INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Event SET 
        name = COALESCE(@name, name), status = COALESCE(@status, status), address = COALESCE(@address, address), 
        event_date = COALESCE(@event_date, event_date), rows = COALESCE(@rows, rows), columns = COALESCE(@columns, columns)
    WHERE id = @id;
    SELECT * FROM Event WHERE id = @id;
END;
GO

CREATE PROCEDURE DeleteEvent @id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; DELETE FROM Event WHERE id = @id; END; GO
CREATE PROCEDURE GetAllEvents AS BEGIN SET NOCOUNT ON; SELECT * FROM Event; END; GO
CREATE PROCEDURE GetEventById @id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; SELECT * FROM Event WHERE id = @id; END; GO

CREATE FUNCTION GetUpcomingEvents() RETURNS TABLE AS RETURN (
    SELECT id, name, address, event_date, (rows * columns) AS capacity, available_seats
    FROM Event WHERE status = 'PUBLISHED' AND event_date >= GETDATE()
);
GO

CREATE FUNCTION GetEventSeatMap (@EventId UNIQUEIDENTIFIER) RETURNS TABLE AS RETURN (
    SELECT s.id, s.id AS seat_id, s.x_coordinate, s.y_coordinate, s.status, s.user_id, s.hold_expires_at, s.seat_type_id, st.name AS seat_type, st.price
    FROM Seat s JOIN SeatType st ON s.seat_type_id = st.id WHERE s.event_id = @EventId
);
GO

CREATE PROCEDURE GetEventDetails @eventId UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON;
    SELECT e.id, e.name, e.status, e.address, e.event_date, (e.rows * e.columns) AS capacity, e.rows, e.columns, e.available_seats, u.name AS organizer_name
    FROM Event e JOIN [User] u ON e.organizer_id = u.id 
    WHERE e.id = @eventId AND e.event_date >= GETDATE();
END;
GO

CREATE PROCEDURE SearchEvents @keyword NVARCHAR(200) = NULL, @fromDate DATETIME = NULL, @toDate DATETIME = NULL
AS BEGIN SET NOCOUNT ON;
    SELECT id, name, address, event_date, (rows * columns) AS capacity, available_seats, status
    FROM Event WHERE status = 'PUBLISHED'
      AND event_date >= GETDATE()
      AND (@keyword IS NULL OR name LIKE '%' + @keyword + '%' OR address LIKE '%' + @keyword + '%')
      AND (@fromDate IS NULL OR event_date >= @fromDate) AND (@toDate IS NULL OR event_date <= @toDate)
    ORDER BY event_date;
END;
GO

-- =========================
-- Seat Procedures
-- =========================

CREATE PROCEDURE CreateSeat 
    @event_id UNIQUEIDENTIFIER, @x_coordinate INT, @y_coordinate INT, @seat_type_id UNIQUEIDENTIFIER, @status NVARCHAR(50), @user_id UNIQUEIDENTIFIER = NULL
AS BEGIN SET NOCOUNT ON;
    DECLARE @id UNIQUEIDENTIFIER = NEWID();
    INSERT INTO Seat (id, event_id, x_coordinate, y_coordinate, seat_type_id, status, user_id)
    VALUES (@id, @event_id, @x_coordinate, @y_coordinate, @seat_type_id, @status, @user_id);
    SELECT * FROM Seat WHERE id = @id;
END;
GO

CREATE PROCEDURE UpdateSeat
    @id UNIQUEIDENTIFIER, @seat_type_id UNIQUEIDENTIFIER = NULL, @user_id UNIQUEIDENTIFIER = NULL, @status NVARCHAR(50) = NULL, @hold_expires_at DATETIME = NULL
AS BEGIN SET NOCOUNT ON;
    UPDATE Seat SET 
        seat_type_id = COALESCE(@seat_type_id, seat_type_id), user_id = COALESCE(@user_id, user_id),
        status = COALESCE(@status, status), hold_expires_at = COALESCE(@hold_expires_at, hold_expires_at)
    WHERE id = @id;
    SELECT * FROM Seat WHERE id = @id;
END;
GO

CREATE PROCEDURE DeleteSeat @id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; DELETE FROM Seat WHERE id = @id; END; GO
CREATE PROCEDURE GetAllSeats AS BEGIN SET NOCOUNT ON; SELECT * FROM Seat; END; GO
CREATE PROCEDURE GetSeatById @id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; SELECT * FROM Seat WHERE id = @id; END; GO
CREATE PROCEDURE GetSeatsByEventId @event_id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; SELECT * FROM Seat WHERE event_id = @event_id; END; GO

-- =========================
-- SeatType Procedures
-- =========================

CREATE PROCEDURE CreateSeatType @event_id UNIQUEIDENTIFIER, @name NVARCHAR(100), @price DECIMAL(10,2)
AS BEGIN SET NOCOUNT ON;
    DECLARE @id UNIQUEIDENTIFIER = NEWID();
    INSERT INTO SeatType (id, name, price, event_id) VALUES (@id, @name, @price, @event_id);
    SELECT * FROM SeatType WHERE id = @id;
END;
GO

CREATE PROCEDURE UpdateSeatType @id UNIQUEIDENTIFIER, @name NVARCHAR(100) = NULL, @price DECIMAL(10,2) = NULL
AS BEGIN SET NOCOUNT ON;
    UPDATE SeatType SET name = COALESCE(@name, name), price = COALESCE(@price, price) WHERE id = @id;
    SELECT * FROM SeatType WHERE id = @id;
END;
GO

CREATE PROCEDURE DeleteSeatType @id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; DELETE FROM SeatType WHERE id = @id; END; GO
CREATE PROCEDURE GetAllSeatTypes AS BEGIN SET NOCOUNT ON; SELECT * FROM SeatType; END; GO
CREATE PROCEDURE GetSeatTypeById @id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; SELECT * FROM SeatType WHERE id = @id; END; GO
CREATE PROCEDURE GetSeatTypesByEventId @event_id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; SELECT * FROM SeatType WHERE event_id = @event_id; END; GO

CREATE PROCEDURE AssignSeatTypeByRectangle @event_id UNIQUEIDENTIFIER, @seat_type_name NVARCHAR(100), @x1 INT, @y1 INT, @x2 INT, @y2 INT
AS BEGIN SET NOCOUNT ON;
    DECLARE @sid UNIQUEIDENTIFIER = (SELECT id FROM SeatType WHERE event_id = @event_id AND name = @seat_type_name);
    IF @sid IS NULL THROW 5012, 'Seat type not found', 1;
    UPDATE Seat SET seat_type_id = @sid
                WHERE event_id = @event_id AND status = 'AVAILABLE' AND x_coordinate BETWEEN @x1 AND @x2 AND y_coordinate BETWEEN @y1 AND @y2;
END;
GO

-- =========================
-- Booking Procedures
-- =========================

CREATE PROCEDURE HoldSeats @user_id UNIQUEIDENTIFIER, @seat_ids dbo.GuidList READONLY, @hold_seconds INT = 600
AS BEGIN SET NOCOUNT ON;
    DECLARE @expire DATETIME = DATEADD(SECOND, @hold_seconds, GETUTCDATE());
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM Seat WITH (UPDLOCK, HOLDLOCK) JOIN @seat_ids i ON Seat.id = i.id WHERE status <> 'AVAILABLE')
        BEGIN
            SELECT Seat.id FROM Seat JOIN @seat_ids i ON Seat.id = i.id WHERE status <> 'AVAILABLE';
            COMMIT TRANSACTION; RETURN;
        END
        UPDATE s SET status = 'ON_HOLD', user_id = @user_id, hold_expires_at = @expire FROM Seat s JOIN @seat_ids i ON s.id = i.id;
        INSERT INTO SeatTransaction (seat_id, user_id, action) SELECT i.id, @user_id, 'ON_HOLD' FROM @seat_ids i;
        COMMIT TRANSACTION;
    END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; THROW; END CATCH
END;
GO

CREATE PROCEDURE ConfirmPurchase @user_id UNIQUEIDENTIFIER, @seat_ids dbo.GuidList READONLY, @payment_method NVARCHAR(50), @amount DECIMAL(10,2)
AS BEGIN SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM Seat WITH (UPDLOCK, HOLDLOCK) JOIN @seat_ids i ON Seat.id = i.id WHERE status <> 'ON_HOLD' OR user_id <> @user_id OR hold_expires_at < GETUTCDATE())
            THROW 50011, 'Invalid hold', 1;
        DECLARE @pid UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Payment (id, amount, payment_date, method, user_id) VALUES (@pid, @amount, GETUTCDATE(), @payment_method, @user_id);
        UPDATE s SET status = 'BOOKED', hold_expires_at = NULL FROM Seat s JOIN @seat_ids i ON s.id = i.id;
        INSERT INTO Ticket (seat_id, payment_id, price) SELECT s.id, @pid, st.price FROM @seat_ids i JOIN Seat s ON i.id = s.id JOIN SeatType st ON s.seat_type_id = st.id;
        INSERT INTO SeatTransaction (seat_id, user_id, action, ticket_id) SELECT s.id, @user_id, 'BOOK', t.id FROM @seat_ids i JOIN Seat s ON i.id = s.id JOIN Ticket t ON s.id = t.seat_id WHERE t.payment_id = @pid;
        COMMIT TRANSACTION;
    END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; THROW; END CATCH
END;
GO

CREATE PROCEDURE ReleaseExpiredHolds
AS BEGIN SET NOCOUNT ON;
    DECLARE @Exp TABLE (id UNIQUEIDENTIFIER, uid UNIQUEIDENTIFIER);
    UPDATE Seat SET status = 'AVAILABLE', user_id = NULL, hold_expires_at = NULL OUTPUT deleted.id, deleted.user_id INTO @Exp WHERE status = 'ON_HOLD' AND hold_expires_at < GETUTCDATE();
    INSERT INTO SeatTransaction (seat_id, user_id, action) SELECT id, uid, 'EXPIRE' FROM @Exp;
END;
GO

CREATE PROCEDURE CancelTicket @ticket_id UNIQUEIDENTIFIER, @user_id UNIQUEIDENTIFIER
AS BEGIN SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @sid UNIQUEIDENTIFIER = (SELECT seat_id FROM Ticket t JOIN Seat s ON t.seat_id = s.id WHERE t.id = @ticket_id AND t.status = 'VALID' AND s.user_id = @user_id AND s.status = 'BOOKED');
        IF @sid IS NULL THROW 50014, 'Invalid ticket', 1;
        UPDATE Ticket SET status = 'REFUNDED' WHERE id = @ticket_id;
        UPDATE Seat SET status = 'AVAILABLE', user_id = NULL, hold_expires_at = NULL WHERE id = @sid;
        INSERT INTO SeatTransaction (seat_id, user_id, action, ticket_id) VALUES (@sid, @user_id, 'CANCEL', @ticket_id);
        COMMIT TRANSACTION;
    END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; THROW; END CATCH
END;
GO

-- =========================
-- View Functions
-- =========================

CREATE FUNCTION ViewPurchasedTickets (@user_id UNIQUEIDENTIFIER) RETURNS TABLE AS RETURN (
    SELECT t.id AS ticket_id, t.payment_id, e.name AS event_name, e.event_date, s.id AS seat_id, s.x_coordinate, s.y_coordinate, st.name AS seat_type, t.price, s.status AS seat_status, t.status, p.payment_date
    FROM Ticket t JOIN Payment p ON t.payment_id = p.id JOIN Seat s ON t.seat_id = s.id JOIN Event e ON s.event_id = e.id JOIN SeatType st ON s.seat_type_id = st.id WHERE p.user_id = @user_id
);
GO

CREATE FUNCTION GetSeatTransactions () RETURNS TABLE AS RETURN (
    SELECT st.id, st.action, st.created_at, u.name AS user_name, u.userName AS user_username, e.name AS event_name, s.x_coordinate, s.y_coordinate, st.ticket_id
    FROM SeatTransaction st JOIN [User] u ON st.user_id = u.id JOIN Seat s ON st.seat_id = s.id JOIN Event e ON s.event_id = e.id
);
GO

-- =========================
-- Payment Procedures
-- =========================

CREATE PROCEDURE GetAllPayments AS BEGIN SET NOCOUNT ON; SELECT * FROM Payment; END; GO
CREATE PROCEDURE GetPaymentById @id UNIQUEIDENTIFIER AS BEGIN SET NOCOUNT ON; SELECT * FROM Payment WHERE id = @id; END; GO


-- =============================================
-- SQL Data Population
-- =============================================
PRINT 'Starting sample data population...';

-- Create Admin
INSERT INTO [User] (name, userName, password, role) VALUES ('System Admin', 'admin', 'admin123', 'ADMIN');

DECLARE @OrgID UNIQUEIDENTIFIER, @Cust1ID UNIQUEIDENTIFIER, @Cust2ID UNIQUEIDENTIFIER;
DECLARE @Event1ID UNIQUEIDENTIFIER, @Event2ID UNIQUEIDENTIFIER, @Event3ID UNIQUEIDENTIFIER, @Event4ID UNIQUEIDENTIFIER, @Event5ID UNIQUEIDENTIFIER;
DECLARE @VipTypeID UNIQUEIDENTIFIER;
DECLARE @DefID UNIQUEIDENTIFIER;

-- Table variables for capturing procedure results
DECLARE @u1 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(100), uname NVARCHAR(100), urole NVARCHAR(20));
DECLARE @u2 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(100), uname NVARCHAR(100), urole NVARCHAR(20));
DECLARE @u3 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(100), uname NVARCHAR(100), urole NVARCHAR(20));

DECLARE @e1 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(200), status NVARCHAR(50), address NVARCHAR(255), event_date DATETIME, rows INT, columns INT, available_seats INT, organizer_id UNIQUEIDENTIFIER);
DECLARE @e2 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(200), status NVARCHAR(50), address NVARCHAR(255), event_date DATETIME, rows INT, columns INT, available_seats INT, organizer_id UNIQUEIDENTIFIER);
DECLARE @e3 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(200), status NVARCHAR(50), address NVARCHAR(255), event_date DATETIME, rows INT, columns INT, available_seats INT, organizer_id UNIQUEIDENTIFIER);
DECLARE @e4 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(200), status NVARCHAR(50), address NVARCHAR(255), event_date DATETIME, rows INT, columns INT, available_seats INT, organizer_id UNIQUEIDENTIFIER);
DECLARE @e5 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(200), status NVARCHAR(50), address NVARCHAR(255), event_date DATETIME, rows INT, columns INT, available_seats INT, organizer_id UNIQUEIDENTIFIER);

DECLARE @st1 TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(100), price DECIMAL(10,2), event_id UNIQUEIDENTIFIER);

DECLARE @SList1 dbo.GuidList;
DECLARE @SList2 dbo.GuidList;

BEGIN TRY
    -- 1. Create Users
    PRINT 'Creating users...';
    INSERT INTO @u1 EXEC RegisterUser 'Alice Organizer', 'alice_org', 'pass123';
    SELECT @OrgID = id FROM @u1;

    INSERT INTO @u2 EXEC RegisterUser 'Bob Customer', 'bob_cust', 'pass123';
    SELECT @Cust1ID = id FROM @u2;

    INSERT INTO @u3 EXEC RegisterUser 'Charlie Customer', 'charlie_cust', 'pass123';
    SELECT @Cust2ID = id FROM @u3;

    -- 2. Create 5 Events
    PRINT 'Creating events...';
    
    INSERT INTO @e1 EXEC CreateEvent 'Midnight Rock Festival', 'Stadium Arena', '2026-09-15 20:00:00', 10, 10, @OrgID;
    SELECT @Event1ID = id FROM @e1;
    EXEC UpdateEvent @id = @Event1ID, @status = 'VERIFY';
    
    INSERT INTO @e2 EXEC CreateEvent 'Future Tech 2026', 'Convention Center', '2026-10-10 09:00:00', 5, 20, @OrgID;
    SELECT @Event2ID = id FROM @e2;
    EXEC UpdateEvent @id = @Event2ID, @status = 'VERIFY';

    INSERT INTO @e3 EXEC CreateEvent 'Laughter Unleashed', 'Downtown Club', '2026-11-05 19:30:00', 8, 8, @OrgID;
    SELECT @Event3ID = id FROM @e3;
    EXEC UpdateEvent @id = @Event3ID, @status = 'VERIFY';

    INSERT INTO @e4 EXEC CreateEvent 'Modern Visions Expo', 'Grand Gallery', '2026-12-01 10:00:00', 4, 15, @OrgID;
    SELECT @Event4ID = id FROM @e4;
    EXEC UpdateEvent @id = @Event4ID, @status = 'VERIFY';

    INSERT INTO @e5 EXEC CreateEvent 'Grace & Hope Gala', 'Royal Ballroom', '2027-01-20 18:30:00', 6, 6, @OrgID;
    SELECT @Event5ID = id FROM @e5;
    EXEC UpdateEvent @id = @Event5ID, @status = 'VERIFY';

    -- 3. Set Prices and Publish
    PRINT 'Setting prices and publishing...';
    
    INSERT INTO @st1 EXEC CreateSeatType @event_id = @Event1ID, @name = 'VIP Front Row', @price = 250.00;
    SELECT @VipTypeID = id FROM @st1;
    EXEC AssignSeatTypeByRectangle @event_id = @Event1ID, @seat_type_name = 'VIP Front Row', @x1 = 1, @y1 = 1, @x2 = 10, @y2 = 2;
    
    SELECT @DefID = id FROM SeatType WHERE event_id = @Event1ID AND name = 'DEFAULT SEAT';
    EXEC UpdateSeatType @id = @DefID, @price = 85.00;
    EXEC UpdateEvent @id = @Event1ID, @status = 'PUBLISHED';

    SELECT @DefID = id FROM SeatType WHERE event_id = @Event2ID AND name = 'DEFAULT SEAT';
    EXEC UpdateSeatType @id = @DefID, @price = 450.00;
    EXEC UpdateEvent @id = @Event2ID, @status = 'PUBLISHED';

    SELECT @DefID = id FROM SeatType WHERE event_id = @Event3ID AND name = 'DEFAULT SEAT';
    EXEC UpdateSeatType @id = @DefID, @price = 45.00;
    EXEC UpdateEvent @id = @Event3ID, @status = 'PUBLISHED';

    -- 4. Simulate Purchases
    PRINT 'Simulating purchases...';
    
    INSERT INTO @SList1 (id) SELECT TOP 2 id FROM Seat WHERE event_id = @Event1ID AND status = 'AVAILABLE';
    EXEC HoldSeats @user_id = @Cust1ID, @seat_ids = @SList1;
    EXEC ConfirmPurchase @user_id = @Cust1ID, @seat_ids = @SList1, @payment_method = 'CREDIT_CARD', @amount = 170.00;

    INSERT INTO @SList2 (id) SELECT TOP 1 id FROM Seat WHERE event_id = @Event3ID AND status = 'AVAILABLE';
    EXEC HoldSeats @user_id = @Cust2ID, @seat_ids = @SList2;
    EXEC ConfirmPurchase @user_id = @Cust2ID, @seat_ids = @SList2, @payment_method = 'E_WALLET', @amount = 45.00;

    PRINT 'Sample data populated successfully.';
END TRY
BEGIN CATCH
    PRINT 'Error occurred during population: ' + ERROR_MESSAGE();
END CATCH
GO
