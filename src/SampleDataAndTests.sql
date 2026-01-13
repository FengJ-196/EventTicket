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
    PRINT '> Testing Ticket Cancellation...';

    -- Pick a ticket to cancel (e.g., from the seats we just booked)
    DECLARE @TicketToCancel UNIQUEIDENTIFIER;
    
    SELECT TOP 1 @TicketToCancel = t.id 
    FROM Ticket t 
    JOIN Seat s ON t.seat_id = s.id 
    WHERE s.user_id = @CustomerID AND t.status = 'VALID';

    IF @TicketToCancel IS NULL
        THROW 50000, 'No valid ticket found to cancel', 1;

    EXEC CancelTicket @ticket_id = @TicketToCancel, @user_id = @CustomerID;

    -- Verify Ticket Refunded
    IF NOT EXISTS (SELECT 1 FROM Ticket WHERE id = @TicketToCancel AND status = 'REFUNDED')
        THROW 50000, 'Ticket status not updated to REFUNDED', 1;

    PRINT '> Ticket Refunded Successfully.';

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

