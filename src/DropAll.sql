USE EventTicketing;
GO

-- Drop tables in reverse order of dependency to avoid Foreign Key errors
DROP TABLE IF EXISTS SeatTransaction;
DROP TABLE IF EXISTS Ticket;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Seat;
DROP TABLE IF EXISTS SeatType;
DROP TABLE IF EXISTS Event;
DROP TABLE IF EXISTS [User];
GO

-- Clean up the User-Defined Table Type
DROP TYPE IF EXISTS dbo.GuidList;
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
