-- Postgres Schema for EventTicketing

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables
DROP TABLE IF EXISTS seat_transaction;
DROP TABLE IF EXISTS ticket;
DROP TABLE IF EXISTS payment;
DROP TABLE IF EXISTS seat;
DROP TABLE IF EXISTS seat_type;
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS users;

-- Tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'ORGANIZER'))
);

CREATE TABLE event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    address VARCHAR(255),
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    rows INT,
    columns INT,
    available_seats INT DEFAULT 0,
    organizer_id UUID NOT NULL REFERENCES users(id),
    CHECK (status IN ('DRAFT', 'PENDING' ,'VERIFY', 'PUBLISHED', 'CANCELLED'))
);

CREATE TABLE seat_type (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    event_id UUID NOT NULL REFERENCES event(id),
    UNIQUE (event_id, name)
);

CREATE TABLE seat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES event(id),
    x_coordinate INT NOT NULL,
    y_coordinate INT NOT NULL,
    seat_type_id UUID NOT NULL REFERENCES seat_type(id),
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    hold_expires_at TIMESTAMP WITH TIME ZONE,
    CHECK (status IN ('AVAILABLE', 'BOOKED', 'ON_HOLD')),
    UNIQUE (event_id, x_coordinate, y_coordinate)
);

CREATE TABLE payment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(id),
    method VARCHAR(50) NOT NULL,
    external_reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'COMPLETED',
    CHECK (method IN ('CREDIT_CARD', 'CASH', 'BANK_TRANSFER', 'E_WALLET'))
);

CREATE TABLE ticket (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seat_id UUID NOT NULL REFERENCES seat(id),
    payment_id UUID NOT NULL REFERENCES payment(id),
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'VALID',
    CHECK (status IN ('VALID', 'REFUNDED', 'SCANNED'))
);

CREATE TABLE seat_transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seat_id UUID NOT NULL REFERENCES seat(id),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL,
    ticket_id UUID REFERENCES ticket(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to maintain available_seats in event table
CREATE OR REPLACE FUNCTION update_available_seats() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status = 'AVAILABLE') THEN
            UPDATE event SET available_seats = available_seats + 1 WHERE id = NEW.event_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status = 'AVAILABLE' AND NEW.status != 'AVAILABLE') THEN
            UPDATE event SET available_seats = available_seats - 1 WHERE id = NEW.event_id;
        ELSIF (OLD.status != 'AVAILABLE' AND NEW.status = 'AVAILABLE') THEN
            UPDATE event SET available_seats = available_seats + 1 WHERE id = NEW.event_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.status = 'AVAILABLE') THEN
            UPDATE event SET available_seats = available_seats - 1 WHERE id = OLD.event_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_seat_available_seats
AFTER INSERT OR UPDATE OR DELETE ON seat
FOR EACH ROW EXECUTE FUNCTION update_available_seats();

-- Trigger to generate seats when event status changes to 'VERIFY'
CREATE OR REPLACE FUNCTION generate_seats_on_verify() RETURNS TRIGGER AS $$
DECLARE
    default_seat_type_id UUID;
BEGIN
    IF (NEW.status = 'VERIFY' AND (OLD.status IS NULL OR OLD.status != 'VERIFY')) THEN
        -- Create default seat type
        INSERT INTO seat_type (name, price, event_id) 
        VALUES ('DEFAULT SEAT', 0, NEW.id) 
        RETURNING id INTO default_seat_type_id;

        -- Generate seats
        INSERT INTO seat (event_id, x_coordinate, y_coordinate, seat_type_id, status)
        SELECT NEW.id, x, y, default_seat_type_id, 'AVAILABLE'
        FROM generate_series(1, NEW.columns) x,
             generate_series(1, NEW.rows) y;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_event_verify_generate_seats
AFTER UPDATE ON event
FOR EACH ROW EXECUTE FUNCTION generate_seats_on_verify();

-- Sample Data
INSERT INTO users (name, user_name, password, role) 
VALUES ('System Admin', 'admin', '$2b$10$YourHashedPasswordHere', 'ADMIN'); 
-- Note: You should hash the password before inserting
