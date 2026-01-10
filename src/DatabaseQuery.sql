-- =========================
-- Create database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'EventTicketing')
    BEGIN
        CREATE DATABASE EventTicketing;
    END
GO
USE EventTicketing;
GO

USE EventTicketing;
GO

-- Drop tables in reverse order of dependency to avoid Foreign Key errors
DROP TABLE IF EXISTS SeatTransaction;
DROP TABLE IF EXISTS Refund;
DROP TABLE IF EXISTS Ticket;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Seat;
DROP TABLE IF EXISTS SeatType;
DROP TABLE IF EXISTS Event;
DROP TABLE IF EXISTS [User];
GO



-- Clean up Procedures and Functions (Optional, but good for a full reset)
DROP PROCEDURE IF EXISTS CreateEvent;
DROP PROCEDURE IF EXISTS CreateSeatType;
DROP PROCEDURE IF EXISTS UpdateSeatType;
DROP PROCEDURE IF EXISTS AssignSeatTypeByRectangle;
DROP PROCEDURE IF EXISTS DisableSeats;
DROP PROCEDURE IF EXISTS EnableSeats;
DROP PROCEDURE IF EXISTS HoldSeats;
DROP PROCEDURE IF EXISTS ConfirmPurchase;
DROP PROCEDURE IF EXISTS ReleaseExpiredHolds;
DROP FUNCTION IF EXISTS GetUpcomingEvents;
DROP FUNCTION IF EXISTS GetEventSeatMap;
DROP FUNCTION IF EXISTS ViewPurchasedTickets;
DROP PROCEDURE IF EXISTS RegisterUser;
DROP PROCEDURE IF EXISTS LoginUser;
DROP PROCEDURE IF EXISTS SearchEvents;
DROP PROCEDURE IF EXISTS GetEventDetails;
DROP PROCEDURE IF EXISTS CancelTicket;
GO


-- =========================
-- User
-- =========================
CREATE TABLE [User] (
                        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                        name NVARCHAR(100) NOT NULL,
                        userName NVARCHAR(100) UNIQUE NOT NULL,
                        password NVARCHAR(100) NOT NULL,
                        role NVARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'))
);

-- Insert Admin User
INSERT INTO [User] (name, userName, password, role)
VALUES ('System Admin', 'admin', 'admin123', 'ADMIN');

-- =========================
-- Event
-- =========================
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
                       CONSTRAINT FK_Event_Organizer
                           FOREIGN KEY (organizer_id) REFERENCES [User](id),
                       CONSTRAINT CK_Event_Status
                           CHECK (status IN ('DRAFT', 'PENDING' ,'VERIFY', 'PUBLISHED'))
);

-- =========================
-- Seat Type
-- =========================
CREATE TABLE SeatType (
                          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                          name NVARCHAR(100) NOT NULL,
                          price DECIMAL(10,2) NOT NULL,
                          event_id UNIQUEIDENTIFIER NOT NULL,

                          CONSTRAINT FK_SeatType_Event
                              FOREIGN KEY (event_id) REFERENCES Event(id),

                          CONSTRAINT UQ_SeatType_Event_Name
                              UNIQUE (event_id, name)
);

-- =========================
-- Seat
-- =========================
CREATE TABLE Seat (
                      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                      event_id UNIQUEIDENTIFIER NOT NULL,
                      x_coordinate INT NOT NULL,
                      y_coordinate INT NOT NULL,
                      seat_type_id UNIQUEIDENTIFIER NOT NULL,
                      user_id UNIQUEIDENTIFIER NULL,
                      status NVARCHAR(50) NOT NULL,
                      hold_expires_at DATETIME NULL,

                      CONSTRAINT FK_Seat_Event
                          FOREIGN KEY (event_id) REFERENCES Event(id),

                      CONSTRAINT FK_Seat_SeatType
                          FOREIGN KEY (seat_type_id) REFERENCES SeatType(id),

                      CONSTRAINT FK_Seat_User
                          FOREIGN KEY (user_id) REFERENCES [User](id),

                      CONSTRAINT CK_Seat_Status CHECK (status IN ('AVAILABLE', 'RESERVED', 'BOOKED', 'ON_HOLD', 'DISABLED')),

                      CONSTRAINT UQ_Seat_UniquePosition UNIQUE (event_id, x_coordinate, y_coordinate)
);
GO

-- =============================================
-- Trigger: Maintain Event.available_seats
-- =============================================
CREATE TRIGGER TR_Seat_MaintainAvailableSeats
    ON Seat
    AFTER INSERT, UPDATE, DELETE
    AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DeltaTable TABLE (event_id UNIQUEIDENTIFIER, delta INT);

    -- Calculate delta for INSERTs and UPDATEs (new state)
    INSERT INTO @DeltaTable (event_id, delta)
    SELECT event_id, 1
    FROM inserted
    WHERE status = 'AVAILABLE';

    INSERT INTO @DeltaTable (event_id, delta)
    SELECT event_id, -1
    FROM deleted
    WHERE status = 'AVAILABLE';

    -- Aggregate changes per event
    WITH Updates AS (
        SELECT event_id, SUM(delta) as change
        FROM @DeltaTable
        GROUP BY event_id
    )
    UPDATE e
    SET available_seats = ISNULL(e.available_seats, 0) + u.change
    FROM Event e
             JOIN Updates u ON e.id = u.event_id;
END;
GO

-- =========================
-- Payment
-- =========================
CREATE TABLE Payment (
                         id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                         amount DECIMAL(10,2) NOT NULL,
                         payment_date DATETIME NOT NULL,
                         user_id UNIQUEIDENTIFIER NOT NULL,
                         method NVARCHAR(50) NOT NULL,

                         FOREIGN KEY (user_id) REFERENCES [User](id),
                         CONSTRAINT CK_Payment_Method
                             CHECK (method in ('CREDIT_CARD', 'CASH', 'BANK_TRANSFER', 'E_WALLET'))
);

-- =========================
-- Ticket
-- =========================
CREATE TABLE Ticket (
                        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                        seat_id UNIQUEIDENTIFIER NOT NULL,
                        payment_id UNIQUEIDENTIFIER NOT NULL,
                        price DECIMAL(10,2) NOT NULL,
                        status NVARCHAR(20) DEFAULT 'VALID',

                        CONSTRAINT FK_Ticket_Seat
                            FOREIGN KEY (seat_id) REFERENCES Seat(id),

                        CONSTRAINT FK_Ticket_Payment
                            FOREIGN KEY (payment_id) REFERENCES Payment(id),

                        CONSTRAINT CK_Ticket_Status CHECK (status IN ('VALID', 'CANCELLED'))
);

-- =========================
-- Seat Transaction
-- =========================
CREATE TABLE SeatTransaction (
                                 id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                                 seat_id UNIQUEIDENTIFIER NOT NULL,
                                 user_id UNIQUEIDENTIFIER NOT NULL,
                                 action NVARCHAR(20) NOT NULL,
                                 ticket_id UNIQUEIDENTIFIER NULL,
                                 created_at DATETIME DEFAULT GETUTCDATE(),

                                 CONSTRAINT FK_SeatTransaction_Seat
                                     FOREIGN KEY (seat_id) REFERENCES Seat(id),

                                 CONSTRAINT FK_SeatTransaction_User
                                     FOREIGN KEY (user_id) REFERENCES [User](id),

                                 CONSTRAINT FK_SeatTransaction_Ticket
                                     FOREIGN KEY (ticket_id) REFERENCES Ticket(id)
);

-- =========================
-- Refund
-- =========================
CREATE TABLE Refund (
                        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                        payment_id UNIQUEIDENTIFIER NOT NULL,
                        ticket_id UNIQUEIDENTIFIER NULL,
                        amount DECIMAL(10,2) NOT NULL,
                        refund_date DATETIME DEFAULT GETUTCDATE(),
                        reason NVARCHAR(255),

                        CONSTRAINT FK_Refund_Payment
                            FOREIGN KEY (payment_id) REFERENCES Payment(id),

                        CONSTRAINT FK_Refund_Ticket
                            FOREIGN KEY (ticket_id) REFERENCES Ticket(id)
);

IF NOT EXISTS (SELECT * FROM sys.types WHERE is_user_defined = 1 AND name = 'GuidList')
    BEGIN
        CREATE TYPE dbo.GuidList AS TABLE
        (
            id UNIQUEIDENTIFIER NOT NULL
        );
    END
GO
--- End of Schema
--- =========================================


--- =========================================
--- Organizer

CREATE PROCEDURE CreateEvent
    @name NVARCHAR(200),
    @address NVARCHAR(255),
    @event_date DATETIME,
    @rows INT,
    @columns INT,
    @organizer_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Event (
        id,
        name,
        status,
        address,
        event_date,
        rows,
        columns,
        available_seats,
        organizer_id
    )
    VALUES (
               NEWID(),
               @name,
               'DRAFT',
               @address,
               @event_date,
               @rows,
               @columns,
               0,
               @organizer_id
           );
END;
GO

-- Create a trigger when the event got updated to be status 'verify' , generate a normal seat type for the event with
-- the price = 0, and generate all seat for the event with the seat type being normal

CREATE TRIGGER TR_Event_Verify_GenerateSeats
    ON Event
    AFTER UPDATE
    AS
BEGIN
    SET NOCOUNT ON;

    SELECT i.id, i.rows, i.columns
    INTO #EventsToProcess
    FROM inserted i
             JOIN deleted d ON i.id = d.id
    WHERE i.status = 'VERIFY'
      AND d.status <> 'VERIFY';

    IF NOT EXISTS (SELECT 1 FROM #EventsToProcess) RETURN;

    DELETE e
    FROM #EventsToProcess e
    WHERE EXISTS (SELECT 1 FROM Seat s WHERE s.event_id = e.id);

    IF NOT EXISTS (SELECT 1 FROM #EventsToProcess) RETURN;

    DECLARE @EventId UNIQUEIDENTIFIER;
    DECLARE @Rows INT;
    DECLARE @Cols INT;

    DECLARE event_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT id, rows, columns FROM #EventsToProcess;

    OPEN event_cursor;
    FETCH NEXT FROM event_cursor INTO @EventId, @Rows, @Cols;

    WHILE @@FETCH_STATUS = 0
        BEGIN
            DECLARE @SeatTypeId UNIQUEIDENTIFIER = NEWID();

            INSERT INTO SeatType (id, name, price, event_id)
            VALUES (@SeatTypeId, 'DEFAULT SEAT', 0, @EventId);

            WITH
                L0 AS (SELECT c FROM (VALUES(1),(1)) AS D(c)),
                L1 AS (SELECT 1 AS c FROM L0 AS A CROSS JOIN L0 AS B),
                L2 AS (SELECT 1 AS c FROM L1 AS A CROSS JOIN L1 AS B),
                L3 AS (SELECT 1 AS c FROM L2 AS A CROSS JOIN L2 AS B),
                L4 AS (SELECT 1 AS c FROM L3 AS A CROSS JOIN L3 AS B), -- 65536
                Nums AS (SELECT ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) AS n FROM L4)
            INSERT INTO Seat (
                id,
                event_id,
                x_coordinate,
                y_coordinate,
                seat_type_id,
                status
            )
            SELECT
                NEWID(),
                @EventId,
                R.n,
                C.n,
                @SeatTypeId,
                'AVAILABLE'
            FROM Nums R
                     CROSS JOIN Nums C
            WHERE R.n <= @Rows AND C.n <= @Cols;

            FETCH NEXT FROM event_cursor INTO @EventId, @Rows, @Cols;
        END

    CLOSE event_cursor;
    DEALLOCATE event_cursor;

    DROP TABLE #EventsToProcess;
END;
GO

CREATE PROCEDURE UpdateSeatType
    @seat_type_id UNIQUEIDENTIFIER,
    @event_id UNIQUEIDENTIFIER,
    @name NVARCHAR(100) = NULL,
    @price DECIMAL(10,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM SeatType
        WHERE id = @seat_type_id
          AND event_id = @event_id
    )
        BEGIN
            THROW 50001, 'SeatType does not belong to the specified Event.', 1;
            RETURN;
        END

    UPDATE SeatType
    SET
        name  = COALESCE(@name, name),
        price = COALESCE(@price, price)
    WHERE id = @seat_type_id;
END;
GO

CREATE PROCEDURE CreateSeatType
    @event_id UNIQUEIDENTIFIER,
    @name NVARCHAR(100),
    @price DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM Event WHERE id = @event_id
    )
        BEGIN
            THROW 50002, 'Event does not exist.', 1;
            RETURN;
        END

    DECLARE @seat_type_id UNIQUEIDENTIFIER = NEWID();

    INSERT INTO SeatType (id, name, price, event_id)
    VALUES (@seat_type_id, @name, @price, @event_id);

-- Return created id
    SELECT @seat_type_id AS seat_type_id;
END;
GO

CREATE PROCEDURE AssignSeatTypeByRectangle
    @event_id UNIQUEIDENTIFIER,
    @seat_type_name NVARCHAR(100),
    @x1 INT,
    @y1 INT,
    @x2 INT,
    @y2 INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @x1 > @x2 OR @y1 > @y2
        THROW 50010, 'Invalid rectangle coordinates.', 1;

    DECLARE @seat_type_id UNIQUEIDENTIFIER;

    IF NOT EXISTS (SELECT 1 FROM Event WHERE id = @event_id)
        THROW 50011, 'Event does not exist.', 1;

    SELECT @seat_type_id = id
    FROM SeatType
    WHERE event_id = @event_id
      AND name = @seat_type_name;

    IF @seat_type_id IS NULL
        THROW 50012, 'Seat type does not exist.', 1;

    UPDATE Seat
    SET seat_type_id = @seat_type_id
    WHERE event_id = @event_id
      AND status IN ('AVAILABLE', 'DISABLED') -- Only update available or disabled seats
      AND x_coordinate BETWEEN @x1 AND @x2
      AND y_coordinate BETWEEN @y1 AND @y2;

END;
GO

CREATE PROCEDURE DisableSeats
    @event_id UNIQUEIDENTIFIER,
    @seat_ids dbo.GuidList READONLY
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Seat
    SET status = 'DISABLED'
    FROM Seat s
             JOIN @seat_ids i ON s.id = i.id
    WHERE s.event_id = @event_id
      AND s.status = 'AVAILABLE'; -- Only disable available seats
END;
GO

CREATE PROCEDURE EnableSeats
    @event_id UNIQUEIDENTIFIER,
    @seat_ids dbo.GuidList READONLY
AS
BEGIN
    SET NOCOUNT ON;

    -- Enable seats
    UPDATE Seat
    SET status = 'AVAILABLE'
    FROM Seat s
             JOIN @seat_ids i ON s.id = i.id
    WHERE s.event_id = @event_id
      AND s.status = 'DISABLED';
END;
GO
GO

-- Potential view analytical data from the event


--- User

CREATE FUNCTION GetUpcomingEvents()
    RETURNS TABLE
        AS
        RETURN
        (
        SELECT
            id,
            name,
            address,
            event_date,
            (rows * columns) AS capacity,
            available_seats
        FROM Event
        WHERE status = 'PUBLISHED'
          AND event_date >= GETDATE()
        );
GO

CREATE FUNCTION GetEventSeatMap
(
    @EventId UNIQUEIDENTIFIER
)
    RETURNS TABLE
        AS
        RETURN
        (
        SELECT
            s.id AS seat_id,
            s.x_coordinate,
            s.y_coordinate,
            s.status,
            s.user_id,
            st.name AS seat_type,
            st.price
        FROM Seat s
                 JOIN SeatType st ON s.seat_type_id = st.id
        WHERE s.event_id = @EventId
        );
GO


CREATE PROCEDURE HoldSeats
    @user_id UNIQUEIDENTIFIER,
    @seat_ids dbo.GuidList READONLY,
    @hold_minutes INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @expire_at DATETIME = DATEADD(MINUTE, @hold_minutes, GETUTCDATE());

    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (
            SELECT 1
            FROM Seat s WITH (UPDLOCK, HOLDLOCK)
                     JOIN @seat_ids i ON s.id = i.id
            WHERE s.status <> 'AVAILABLE'
        )
            BEGIN
                THROW 50010, 'One or more seats are not available.', 1;
            END

        DECLARE @HeldSeatsInfo TABLE (
                                         event_id UNIQUEIDENTIFIER,
                                         seat_id UNIQUEIDENTIFIER
                                     );

        UPDATE s
        SET
            status = 'ON_HOLD',
            user_id = @user_id,
            hold_expires_at = @expire_at
        OUTPUT inserted.event_id, inserted.id INTO @HeldSeatsInfo
        FROM Seat s
                 JOIN @seat_ids i ON s.id = i.id;



        INSERT INTO SeatTransaction (id, seat_id, user_id, action, created_at)
        SELECT NEWID(), seat_id, @user_id, 'ON_HOLD', GETUTCDATE()
        FROM @HeldSeatsInfo;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE ConfirmPurchase
    @user_id UNIQUEIDENTIFIER,
    @seat_ids dbo.GuidList READONLY,
    @payment_method NVARCHAR(50),
    @amount DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validate holds
        IF EXISTS (
            SELECT 1
            FROM Seat s WITH (UPDLOCK, HOLDLOCK)
                     JOIN @seat_ids i ON s.id = i.id
            WHERE s.status <> 'ON_HOLD'
               OR s.user_id <> @user_id
               OR s.hold_expires_at < GETUTCDATE()
        )
            BEGIN
                THROW 50011, 'Seat hold expired or invalid.', 1;
            END

        -- Create payment
        DECLARE @payment_id UNIQUEIDENTIFIER = NEWID();

        INSERT INTO Payment (id, amount, payment_date, method, user_id)
        VALUES (@payment_id, @amount, GETUTCDATE(), @payment_method, @user_id);

-- Book seats
        UPDATE s
        SET
            status = 'BOOKED',
            hold_expires_at = NULL
        FROM Seat s
                 JOIN @seat_ids i ON s.id = i.id;

        DECLARE @CreatedTickets table (
                                          ticket_id UNIQUEIDENTIFIER,
                                          seat_id UNIQUEIDENTIFIER
                                      );

        INSERT INTO Ticket (id, seat_id, payment_id, price, status)
        OUTPUT inserted.id, inserted.seat_id INTO @CreatedTickets
        SELECT NEWID(), s.id, @payment_id, st.price, 'VALID'
        FROM @seat_ids i
                 JOIN Seat s ON i.id = s.id
                 JOIN SeatType st ON s.seat_type_id = st.id;

        INSERT INTO SeatTransaction (id, seat_id, user_id, action, ticket_id, created_at)
        SELECT
            NEWID(),
            t.seat_id,
            @user_id,
            'BOOK',
            t.ticket_id,
            GETUTCDATE()
        FROM @CreatedTickets t;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END;
GO

CREATE PROCEDURE ReleaseExpiredHolds
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ExpiredSeats table (
                                    seat_id UNIQUEIDENTIFIER,
                                    user_id UNIQUEIDENTIFIER,
                                    event_id UNIQUEIDENTIFIER
                                );

    UPDATE Seat
    SET
        status = 'AVAILABLE',
        user_id = NULL,
        hold_expires_at = NULL
    OUTPUT deleted.id, deleted.user_id, deleted.event_id INTO @ExpiredSeats
    WHERE status = 'ON_HOLD'
      AND hold_expires_at < GETUTCDATE();

    INSERT INTO SeatTransaction (id, seat_id, user_id, action, created_at)
    SELECT NEWID(), seat_id, user_id, 'EXPIRE', GETUTCDATE()
    FROM @ExpiredSeats;
END;
GO

CREATE FUNCTION ViewPurchasedTickets
(
    @user_id UNIQUEIDENTIFIER
)
    RETURNS TABLE
        AS
        RETURN
        (
        SELECT
            t.id            AS ticket_id,
            p.id            AS payment_id,
            e.name          AS event_name,
            e.event_date,
            s.id            AS seat_id,
            s.x_coordinate,
            s.y_coordinate,
            st.name         AS seat_type,
            t.price,
            s.status        AS seat_status,
            p.payment_date
        FROM Seat s
                 JOIN Ticket t      ON t.seat_id = s.id
                 JOIN Payment p     ON t.payment_id = p.id
                 JOIN Event e       ON s.event_id = e.id
                 JOIN SeatType st   ON s.seat_type_id = st.id
        WHERE s.user_id = @user_id
          AND s.status = 'BOOKED'
          AND t.status = 'VALID'
        );
GO

CREATE PROCEDURE CancelTicket
    @ticket_id UNIQUEIDENTIFIER,
    @user_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @seat_id UNIQUEIDENTIFIER;
        DECLARE @event_id UNIQUEIDENTIFIER;

        -- Validate ticket ownership and status
        SELECT @seat_id = t.seat_id, @event_id = s.event_id
        FROM Ticket t
                 JOIN Seat s ON t.seat_id = s.id
        WHERE t.id = @ticket_id
          AND t.status = 'VALID'
          AND s.user_id = @user_id
          AND s.status = 'BOOKED';

        IF @seat_id IS NULL
            THROW 50014, 'Ticket not found or invalid.', 1;

        UPDATE Ticket
        SET status = 'CANCELLED'
        WHERE id = @ticket_id AND status = 'VALID';

        IF @@ROWCOUNT = 0 THROW 50015, 'Ticket already cancelled or invalid.', 1;

        UPDATE Seat
        SET status = 'AVAILABLE',
            user_id = NULL,
            hold_expires_at = NULL
        WHERE id = @seat_id AND status = 'BOOKED';



        INSERT INTO SeatTransaction (id, seat_id, user_id, action, ticket_id, created_at)
        VALUES (NEWID(), @seat_id, @user_id, 'CANCEL', @ticket_id, GETUTCDATE());

        DECLARE @price DECIMAL(10,2);
        DECLARE @payment_id UNIQUEIDENTIFIER;

        SELECT @price = t.price, @payment_id = t.payment_id
        FROM Ticket t
        WHERE t.id = @ticket_id;

        INSERT INTO Refund (id, payment_id, ticket_id, amount, reason)
        VALUES (NEWID(), @payment_id, @ticket_id, @price, 'Customer Cancelled Ticket');

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END;
GO


--- Potential admin will verify the events.

-- =============================================
-- New Procedures for UI Integration
-- =============================================

CREATE PROCEDURE RegisterUser
    @name NVARCHAR(100),
    @userName NVARCHAR(100),
    @password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM [User] WHERE userName = @userName)
        BEGIN
            THROW 50001, 'Username already exists.', 1;
            RETURN;
        END

    INSERT INTO [User] (name, userName, password)
    VALUES (@name, @userName, @password);

    SELECT id, name FROM [User] WHERE userName = @userName;
END;
GO

CREATE PROCEDURE LoginUser
    @userName NVARCHAR(100),
    @password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT id, name, userName, role
    FROM [User]
    WHERE userName = @userName AND password = @password;
END;
GO

CREATE PROCEDURE SearchEvents
    @keyword NVARCHAR(200) = NULL,
    @fromDate DATETIME = NULL,
    @toDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.id,
        e.name,
        e.address,
        e.event_date,
        (e.rows * e.columns) AS capacity,
        e.available_seats,
        e.status
    FROM Event e
    WHERE e.status = 'PUBLISHED'
      AND (@keyword IS NULL OR e.name LIKE '%' + @keyword + '%' OR e.address LIKE '%' + @keyword + '%')
      AND (@fromDate IS NULL OR e.event_date >= @fromDate)
      AND (@toDate IS NULL OR e.event_date <= @toDate)
    ORDER BY e.event_date;
END;
GO

CREATE PROCEDURE GetEventDetails
@eventId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.id,
        e.name,
        e.status,
        e.address,
        e.event_date,
        (e.rows * e.columns) AS capacity,
        e.rows,
        e.columns,
        e.available_seats,
        u.name AS organizer_name
    FROM Event e
             JOIN [User] u ON e.organizer_id = u.id
    WHERE e.id = @eventId;
END;
GO


-- =============================================
-- SQL Test Script associated with EventTicketing
-- =============================================

USE EventTicketing;
GO

SET NOCOUNT ON;

-- 1. Setup Variables
DECLARE @OrganizerID UNIQUEIDENTIFIER;
DECLARE @CustomerID UNIQUEIDENTIFIER;
DECLARE @EventID UNIQUEIDENTIFIER;
DECLARE @VIPSeatTypeId UNIQUEIDENTIFIER;
DECLARE @SeatList dbo.GuidList;
DECLARE @ExpireSeatList dbo.GuidList;

PRINT '=== STARTING TEST SCENARIO ===';


BEGIN TRY
    -- 2. Create Users
    -- We append a timestamp to username to avoid unique constraint collisions on repeated runs
    DECLARE @Suffix NVARCHAR(20) = CONVERT(NVARCHAR(20), GETDATE(), 112) + '_' + REPLACE(CONVERT(NVARCHAR(20), GETDATE(), 108), ':', '');

    INSERT INTO [User] (name, userName, password)
    VALUES ('John Organizer', 'organizer_' + @Suffix, 'pass123'),
           ('Jane Customer', 'customer_' + @Suffix, 'pass123');

    SELECT TOP 1 @OrganizerID = id FROM [User] WHERE userName = 'organizer_' + @Suffix;
    SELECT TOP 1 @CustomerID = id FROM [User] WHERE userName = 'customer_' + @Suffix;

    IF @OrganizerID IS NULL OR @CustomerID IS NULL
        THROW 50000, 'Failed to create test users', 1;

    PRINT '> Users Created with Suffix: ' + @Suffix;

    -- 3. Create Event (Draft)
    -- Name: 'Summer Music Festival', 3 rows, 3 columns (9 seats)
    PRINT '> Creating Event...';
    EXEC CreateEvent
         @name = 'Summer Music Festival',
         @address = 'Central Park',
         @event_date = '2026-07-01 18:00:00',
         @rows = 3,
         @columns = 3,
         @organizer_id = @OrganizerID;

    -- Get the Event ID (Assuming most recent for this organizer)
    SELECT TOP 1 @EventID = id FROM Event WHERE organizer_id = @OrganizerID ORDER BY event_date DESC;

    IF @EventID IS NULL
        THROW 50000, 'Failed to create event', 1;

    PRINT '> Event Created ID: ' + CAST(@EventID AS NVARCHAR(50));

    -- 4. Verify Event (Trigger generates seats)
    PRINT '> Verifying Event (Generating Seats)...';
    UPDATE Event SET status = 'VERIFY' WHERE id = @EventID;

    -- Check Seats
    DECLARE @SeatCount INT;
    SELECT @SeatCount = COUNT(*) FROM Seat WHERE event_id = @EventID;

    IF @SeatCount <> 9
        THROW 50000, 'Seat generation mismatch', 1;

    PRINT '> Seats Generated: ' + CAST(@SeatCount AS NVARCHAR(10)) + ' (Expected: 9)';

    -- 5. Create VIP Seat Type
    PRINT '> Creating VIP Seat Type...';
    EXEC CreateSeatType @event_id = @EventID, @name = 'VIP', @price = 150.00;
    SELECT @VIPSeatTypeId = id FROM SeatType WHERE event_id = @EventID AND name = 'VIP';

    -- 6. Assign VIP Seats (Row 1)
    PRINT '> Assigning Row 1 to VIP...';
    EXEC AssignSeatTypeByRectangle
         @event_id = @EventID,
         @seat_type_name = 'VIP',
         @x1 = 1, @y1 = 1,
         @x2 = 1, @y2 = 3; -- Row 1, Cols 1-3

    -- 7. Publish Event
    PRINT '> Publishing Event...';
    UPDATE Event SET status = 'PUBLISHED' WHERE id = @EventID;

    -- 8. Test GetUpcomingEvents
    PRINT '--- [Func] GetUpcomingEvents ---';
    SELECT name, event_date, available_seats FROM GetUpcomingEvents();

    -- 9. Test GetEventSeatMap
    PRINT '--- [Func] GetEventSeatMap (Top 5 lines) ---';
    SELECT TOP 5 x_coordinate, y_coordinate, seat_type, price, status
    FROM GetEventSeatMap(@EventID)
    ORDER BY x_coordinate, y_coordinate;

    -- 10. Hold Seats (Row 2, Col 1 and 2)
    DELETE FROM @SeatList;
    INSERT INTO @SeatList (id)
    SELECT id FROM Seat
    WHERE event_id = @EventID AND x_coordinate = 2 AND y_coordinate IN (1, 2);

    PRINT '> Holding 2 Seats (Row 2, Col 1 & 2)...';
    EXEC HoldSeats @user_id = @CustomerID, @seat_ids = @SeatList, @hold_minutes = 15;

    -- Verify Hold
    SELECT x_coordinate, y_coordinate, status, hold_expires_at
    FROM Seat
    WHERE event_id = @EventID AND status = 'ON_HOLD';

    -- 11. Confirm Purchase
    PRINT '> Confirming Purchase for Held Seats...';
    EXEC ConfirmPurchase
         @user_id = @CustomerID,
         @seat_ids = @SeatList,
         @payment_method = 'CREDIT_CARD',
         @amount = 200.00;

    -- Verify Booked
    SELECT x_coordinate, y_coordinate, status
    FROM Seat
    WHERE event_id = @EventID AND status = 'BOOKED';

    -- 12. View Purchased Tickets
    PRINT '--- [Func] ViewPurchasedTickets ---';
    SELECT event_name, seat_id, price, payment_date FROM ViewPurchasedTickets(@CustomerID);

    -- 13. Test Cancel Ticket (Refund)
    PRINT '> Testing Ticket Cancellation & Refund...';

    -- Pick a ticket to cancel (e.g., from the seats we just booked)
    DECLARE @TicketToCancel UNIQUEIDENTIFIER;

    SELECT TOP 1 @TicketToCancel = t.id
    FROM Ticket t
             JOIN Seat s ON t.seat_id = s.id
    WHERE s.user_id = @CustomerID AND t.status = 'VALID';

    IF @TicketToCancel IS NULL
        THROW 50000, 'No valid ticket found to cancel', 1;

    EXEC CancelTicket @ticket_id = @TicketToCancel, @user_id = @CustomerID;

    -- Verify Ticket Cancelled
    IF NOT EXISTS (SELECT 1 FROM Ticket WHERE id = @TicketToCancel AND status = 'CANCELLED')
        THROW 50000, 'Ticket status not updated to CANCELLED', 1;

    -- Verify Refund Record
    IF NOT EXISTS (SELECT 1 FROM Refund WHERE ticket_id = @TicketToCancel AND amount > 0)
        THROW 50000, 'Refund record not created', 1;

    PRINT '> Ticket Cancelled and Refunded Successfully.';

    -- 14. Test Expiry
    PRINT '> Testing Expiry Logic...';

    -- Hold another seat (Row 3, Col 1)
    DELETE FROM @ExpireSeatList;
    INSERT INTO @ExpireSeatList (id)
    SELECT id FROM Seat
    WHERE event_id = @EventID AND x_coordinate = 3 AND y_coordinate = 1;

    PRINT '> Holding Seat (3,1)...';
    EXEC HoldSeats @user_id = @CustomerID, @seat_ids = @ExpireSeatList, @hold_minutes = 10;

    -- Manually expire it
    PRINT '> Manually simulating expiration...';
    UPDATE Seat SET hold_expires_at = DATEADD(MINUTE, -1, GETUTCDATE())
    WHERE id IN (SELECT id FROM @ExpireSeatList);

    PRINT '> Running ReleaseExpiredHolds...';
    EXEC ReleaseExpiredHolds;

    -- Verify it is available again
    SELECT x_coordinate, y_coordinate, status
    FROM Seat
    WHERE id IN (SELECT id FROM @ExpireSeatList);

    PRINT '=== TEST COMPLETE ===';

    -- 15. Test New Procedures
    PRINT '=== TESTING NEW UI PROCEDURES ===';

    -- Register
    PRINT '> Testing RegisterUser...';
    DECLARE @NewUserTbl TABLE (id UNIQUEIDENTIFIER, name NVARCHAR(100));
    INSERT INTO @NewUserTbl EXEC RegisterUser 'Test User', 'testuser_new', 'password';

    DECLARE @NewUserID UNIQUEIDENTIFIER;
    SELECT @NewUserID = id FROM @NewUserTbl;

    IF @NewUserID IS NULL THROW 50000, 'RegisterUser failed', 1;
    PRINT '> Registered ID: ' + CAST(@NewUserID AS NVARCHAR(50));

    -- Login
    PRINT '> Testing LoginUser...';
    EXEC LoginUser 'testuser_new', 'password';

    -- Search
    PRINT '> Testing SearchEvents...';
    EXEC SearchEvents @keyword = 'Summer', @fromDate = '2026-01-01';

    -- Details
    PRINT '> Testing GetEventDetails...';
    EXEC GetEventDetails @EventID;

    -- 16. Test Disable/Enable Seats (New Feature)
    PRINT '=== TESTING DISABLE/ENABLE SEATS ===';

    DECLARE @DisableSeatList dbo.GuidList;
    DELETE FROM @DisableSeatList;

    -- Pick a seat to disable (e.g. Row 3, Col 3)
    INSERT INTO @DisableSeatList (id)
    SELECT id FROM Seat WHERE event_id = @EventID AND x_coordinate = 3 AND y_coordinate = 3;

    PRINT '> Disabling Seat (3,3)...';
    EXEC DisableSeats @event_id = @EventID, @seat_ids = @DisableSeatList;

    -- Verify Disabled
    IF NOT EXISTS (SELECT 1 FROM Seat WHERE event_id = @EventID AND x_coordinate = 3 AND y_coordinate = 3 AND status = 'DISABLED')
        THROW 50000, 'Seat failed to disable', 1;

    -- Attempt to Hold Disabled Seat (Should Fail)
    BEGIN TRY
        PRINT '> Attempting to Hold Disabled Seat (Expected Failure)...';
        EXEC HoldSeats @user_id = @CustomerID, @seat_ids = @DisableSeatList;
        THROW 50000, 'Failed to block hold on disabled seat', 1;
    END TRY
    BEGIN CATCH
        PRINT '> Correctly blocked holding disabled seat: ' + ERROR_MESSAGE();
    END CATCH

    -- Re-Enable Seat
    PRINT '> Re-Enabling Seat (3,3)...';
    EXEC EnableSeats @event_id = @EventID, @seat_ids = @DisableSeatList;

    -- Verify Available
    IF NOT EXISTS (SELECT 1 FROM Seat WHERE event_id = @EventID AND x_coordinate = 3 AND y_coordinate = 3 AND status = 'AVAILABLE')
        THROW 50000, 'Seat failed to enable', 1;

    PRINT '=== ALL TESTS PASSED ===';

END TRY
BEGIN CATCH
    PRINT '!!! ERROR OCCURRED !!!';
    PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(20));
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(20));
END CATCH
GO
