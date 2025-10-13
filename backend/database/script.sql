-- create db and use
DROP DATABASE IF EXISTS wad2_project;
CREATE DATABASE wad2_project;
USE wad2_project;

-- create users table
CREATE TABLE users (
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(15) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- create businesses table
CREATE TABLE businesses (
    uen VARCHAR(20) NOT NULL PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_category VARCHAR(100),
    description TEXT,
    address VARCHAR(500),
    open247 BOOLEAN DEFAULT FALSE,
    email VARCHAR(100),
    phone_number VARCHAR(20),
    website_link VARCHAR(255),
    social_media_link VARCHAR(255),
    wallpaper VARCHAR(255),
    date_of_creation DATE,
    price_tier ENUM('low', 'medium', 'high'),
    offers_delivery BOOLEAN DEFAULT FALSE,
    offers_pickup BOOLEAN DEFAULT FALSE
);

-- create payment options table (since there may be more than one payment option)
CREATE TABLE business_payment_options (
    id INT AUTO_INCREMENT,
    uen VARCHAR(20) NOT NULL,
    payment_option VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (uen) REFERENCES businesses(uen) ON DELETE CASCADE
);

-- create opening_hours table
CREATE TABLE business_opening_hours (
    id INT AUTO_INCREMENT,
    uen VARCHAR(20) NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (uen) REFERENCES businesses(uen) ON DELETE CASCADE
);

-- Users data
INSERT INTO users (firstName, lastName, email, password, role) VALUES
('John', 'Tan', 'john.tan@email.com', 'hash', 'user'),
('Mary', 'Lim', 'mary.lim@email.com', 'hash', 'user'),
('David', 'Wong', 'david.wong@email.com', 'hash', 'user'),
('Sarah', 'Chen', 'sarah.chen@email.com', 'hash', 'admin');

-- Businesses data
INSERT INTO businesses (uen, password, business_name, business_category, description, address, open247, email, phone_number, website_link, social_media_link, wallpaper, date_of_creation, price_tier, offers_delivery, offers_pickup) VALUES
('202301234A', 'hash', 'The Daily Loaf Bakery', 'fnb', 'Artisanal breads and pastries baked fresh daily with premium ingredients', '123 Orchard Road, Singapore 238858', FALSE, 'hello@dailyloaf.sg', '+65 6234 5678', 'https://www.dailyloaf.sg', 'https://instagram.com/dailyloafbakery', 'The Daily Loaf Bakery.jpg', '2023-01-15', 'medium', TRUE, TRUE),

('202302456B', 'hash', 'Gents Grooming Parlor', 'services', 'Traditional barbershop offering classic cuts and modern styling for gentlemen', '456 Tanjong Pagar Road, Singapore 088463', FALSE, 'book@gentsgrooming.sg', '+65 6345 6789', 'https://www.gentsgrooming.sg', 'https://facebook.com/gentsgrooming', 'Gents Grooming Parlor.jpg', '2023-02-20', 'medium', FALSE, FALSE),

('202303789C', 'hash', 'Java Junction Cafe', 'fnb', 'Specialty coffee and light bites in a cozy atmosphere perfect for work or relaxation', '789 Bugis Street, Singapore 188735', FALSE, 'info@javajunction.sg', '+65 6456 7890', 'https://www.javajunction.sg', 'https://instagram.com/javajunctionsg', 'Java Junction Cafe.jpg', '2023-03-10', 'low', TRUE, TRUE),

('202304012D', 'hash', 'FitCore Studio', 'health_wellness', 'High-intensity fitness training with certified instructors and state-of-the-art equipment', '321 Marina Boulevard, Singapore 018985', FALSE, 'register@fitcorestudio.sg', '+65 6567 8901', 'https://www.fitcorestudio.sg', 'https://instagram.com/fitcoresg', 'FitCore Studio.jpg', '2023-04-05', 'high', FALSE, FALSE),

('202305345E', 'hash', 'Artisan Alley Crafts', 'retail', 'Handmade crafts and unique gifts created by local artisans', '234 Haji Lane, Singapore 189218', FALSE, 'shop@artisanalley.sg', '+65 6678 9012', 'https://www.artisanalley.sg', 'https://instagram.com/artisanalleysg', 'Artisan Alley Crafts.jpg', '2023-05-18', 'medium', FALSE, TRUE),

('202306678F', 'hash', 'GreenScape Solutions', 'services', 'Professional landscaping and garden maintenance services for residential and commercial properties', '567 Changi Business Park, Singapore 486025', FALSE, 'enquiry@greenscape.sg', '+65 6789 0123', 'https://www.greenscape.sg', 'https://facebook.com/greenscapesg', 'GreenScape Solutions.jpg', '2023-06-22', 'high', FALSE, FALSE),

('202307901G', 'hash', 'Chapter & Verse Books', 'retail', 'Independent bookstore featuring curated selections and rare finds for book lovers', '890 Bras Basah Road, Singapore 189555', FALSE, 'hello@chapterverse.sg', '+65 6890 1234', 'https://www.chapterverse.sg', 'https://instagram.com/chapterversesg', 'Chapter & Verse Books.jpg', '2023-07-08', 'low', TRUE, TRUE),

('202308234H', 'hash', 'Chic Street Boutique', 'retail', 'Trendy fashion and accessories for the modern woman', '145 Arab Street, Singapore 199827', FALSE, 'shop@chicstreet.sg', '+65 6901 2345', 'https://www.chicstreet.sg', 'https://instagram.com/chicstreetsg', 'Chic Street Boutique.jpg', '2023-08-14', 'medium', TRUE, TRUE),

('202309567I', 'hash', 'Elegance & Co', 'retail', 'Premium designer fashion and luxury accessories for discerning customers', '2 Orchard Turn, ION Orchard, Singapore 238801', FALSE, 'concierge@eleganceco.sg', '+65 6012 3456', 'https://www.eleganceco.sg', 'https://instagram.com/elegancecosg', 'Elegance & Co.jpg', '2023-09-01', 'high', FALSE, TRUE),

('202310890J', 'hash', 'Mama\'s Kitchen', 'fnb', 'Home-style comfort food with authentic local flavors in a warm family setting', '678 Tiong Bahru Road, Singapore 158789', FALSE, 'reservations@mamaskitchen.sg', '+65 6123 4567', 'https://www.mamaskitchen.sg', 'https://facebook.com/mamaskitchensg', 'Mama\'s Kitchen.jpg', '2023-10-12', 'low', TRUE, TRUE),

('202311123K', 'hash', 'EnergyCore Ltd', 'professional_services', 'Leading energy solutions and consulting services for sustainable business operations', '100 Pasir Panjang Road, Singapore 118518', TRUE, 'contact@energycore.sg', '+65 6234 5678', 'https://www.energycore.sg', 'https://linkedin.com/company/energycore', 'EnergyCore Ltd.jpg', '2023-11-20', 'high', FALSE, FALSE),

('202312456L', 'hash', 'Pawfect Grooming', 'services', 'Professional pet grooming services with gentle care for your furry friends', '234 Serangoon Road, Singapore 218078', FALSE, 'book@pawfectgrooming.sg', '+65 6345 6789', 'https://www.pawfectgrooming.sg', 'https://instagram.com/pawfectsg', 'Pawfect Grooming.jpeg', '2023-12-05', 'medium', FALSE, TRUE);

-- Payment options
INSERT INTO business_payment_options (uen, payment_option) VALUES
('202301234A', 'cash'), ('202301234A', 'card'), ('202301234A', 'paynow'), ('202301234A', 'digital_wallets'),
('202302456B', 'cash'), ('202302456B', 'card'), ('202302456B', 'paynow'),
('202303789C', 'cash'), ('202303789C', 'card'), ('202303789C', 'digital_wallets'),
('202304012D', 'card'), ('202304012D', 'paynow'), ('202304012D', 'digital_wallets'),
('202305345E', 'cash'), ('202305345E', 'card'), ('202305345E', 'paynow'),
('202306678F', 'card'), ('202306678F', 'paynow'),
('202307901G', 'cash'), ('202307901G', 'card'), ('202307901G', 'paynow'), ('202307901G', 'digital_wallets'),
('202308234H', 'card'), ('202308234H', 'paynow'), ('202308234H', 'digital_wallets'),
('202309567I', 'card'), ('202309567I', 'digital_wallets'),
('202310890J', 'cash'), ('202310890J', 'card'), ('202310890J', 'paynow'), ('202310890J', 'digital_wallets'),
('202311123K', 'card'), ('202311123K', 'paynow'),
('202312456L', 'cash'), ('202312456L', 'card'), ('202312456L', 'paynow'), ('202312456L', 'digital_wallets');

-- Opening hours
INSERT INTO business_opening_hours (uen, day_of_week, open_time, close_time) VALUES
-- The Daily Loaf Bakery
('202301234A', 'Monday', '07:00:00', '19:00:00'),
('202301234A', 'Tuesday', '07:00:00', '19:00:00'),
('202301234A', 'Wednesday', '07:00:00', '19:00:00'),
('202301234A', 'Thursday', '07:00:00', '19:00:00'),
('202301234A', 'Friday', '07:00:00', '19:00:00'),
('202301234A', 'Saturday', '08:00:00', '18:00:00'),
('202301234A', 'Sunday', '08:00:00', '17:00:00'),

-- Gents Grooming Parlor
('202302456B', 'Tuesday', '10:00:00', '20:00:00'),
('202302456B', 'Wednesday', '10:00:00', '20:00:00'),
('202302456B', 'Thursday', '10:00:00', '20:00:00'),
('202302456B', 'Friday', '10:00:00', '20:00:00'),
('202302456B', 'Saturday', '09:00:00', '19:00:00'),
('202302456B', 'Sunday', '09:00:00', '18:00:00'),

-- Java Junction Cafe
('202303789C', 'Monday', '08:00:00', '22:00:00'),
('202303789C', 'Tuesday', '08:00:00', '22:00:00'),
('202303789C', 'Wednesday', '08:00:00', '22:00:00'),
('202303789C', 'Thursday', '08:00:00', '22:00:00'),
('202303789C', 'Friday', '08:00:00', '23:00:00'),
('202303789C', 'Saturday', '09:00:00', '23:00:00'),
('202303789C', 'Sunday', '09:00:00', '22:00:00'),

-- FitCore Studio
('202304012D', 'Monday', '06:00:00', '22:00:00'),
('202304012D', 'Tuesday', '06:00:00', '22:00:00'),
('202304012D', 'Wednesday', '06:00:00', '22:00:00'),
('202304012D', 'Thursday', '06:00:00', '22:00:00'),
('202304012D', 'Friday', '06:00:00', '22:00:00'),
('202304012D', 'Saturday', '08:00:00', '20:00:00'),
('202304012D', 'Sunday', '08:00:00', '20:00:00'),

-- Artisan Alley Crafts
('202305345E', 'Wednesday', '11:00:00', '19:00:00'),
('202305345E', 'Thursday', '11:00:00', '19:00:00'),
('202305345E', 'Friday', '11:00:00', '20:00:00'),
('202305345E', 'Saturday', '10:00:00', '20:00:00'),
('202305345E', 'Sunday', '10:00:00', '19:00:00'),

-- GreenScape Solutions
('202306678F', 'Monday', '08:00:00', '18:00:00'),
('202306678F', 'Tuesday', '08:00:00', '18:00:00'),
('202306678F', 'Wednesday', '08:00:00', '18:00:00'),
('202306678F', 'Thursday', '08:00:00', '18:00:00'),
('202306678F', 'Friday', '08:00:00', '18:00:00'),
('202306678F', 'Saturday', '08:00:00', '13:00:00'),

-- Chapter & Verse Books
('202307901G', 'Monday', '10:00:00', '21:00:00'),
('202307901G', 'Tuesday', '10:00:00', '21:00:00'),
('202307901G', 'Wednesday', '10:00:00', '21:00:00'),
('202307901G', 'Thursday', '10:00:00', '21:00:00'),
('202307901G', 'Friday', '10:00:00', '22:00:00'),
('202307901G', 'Saturday', '10:00:00', '22:00:00'),
('202307901G', 'Sunday', '11:00:00', '20:00:00'),

-- Chic Street Boutique
('202308234H', 'Monday', '11:00:00', '20:00:00'),
('202308234H', 'Tuesday', '11:00:00', '20:00:00'),
('202308234H', 'Wednesday', '11:00:00', '20:00:00'),
('202308234H', 'Thursday', '11:00:00', '20:00:00'),
('202308234H', 'Friday', '11:00:00', '21:00:00'),
('202308234H', 'Saturday', '10:00:00', '21:00:00'),
('202308234H', 'Sunday', '11:00:00', '20:00:00'),

-- Elegance & Co
('202309567I', 'Monday', '10:00:00', '22:00:00'),
('202309567I', 'Tuesday', '10:00:00', '22:00:00'),
('202309567I', 'Wednesday', '10:00:00', '22:00:00'),
('202309567I', 'Thursday', '10:00:00', '22:00:00'),
('202309567I', 'Friday', '10:00:00', '22:00:00'),
('202309567I', 'Saturday', '10:00:00', '22:00:00'),
('202309567I', 'Sunday', '10:00:00', '22:00:00'),

-- Mama's Kitchen
('202310890J', 'Monday', '11:00:00', '21:30:00'),
('202310890J', 'Tuesday', '11:00:00', '21:30:00'),
('202310890J', 'Wednesday', '11:00:00', '21:30:00'),
('202310890J', 'Thursday', '11:00:00', '21:30:00'),
('202310890J', 'Friday', '11:00:00', '22:00:00'),
('202310890J', 'Saturday', '10:30:00', '22:00:00'),
('202310890J', 'Sunday', '10:30:00', '21:30:00'),

-- EnergyCore Ltd (24/7, no hours needed)

-- Pawfect Grooming
('202312456L', 'Tuesday', '09:00:00', '18:00:00'),
('202312456L', 'Wednesday', '09:00:00', '18:00:00'),
('202312456L', 'Thursday', '09:00:00', '18:00:00'),
('202312456L', 'Friday', '09:00:00', '18:00:00'),
('202312456L', 'Saturday', '09:00:00', '19:00:00'),
('202312456L', 'Sunday', '10:00:00', '17:00:00');