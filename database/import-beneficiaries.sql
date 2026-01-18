-- ============================================
-- IMPORT BENEFICIARIES AND HOUSEHOLDS
-- Run this in Supabase SQL Editor
-- ============================================

-- Helper function to parse address
-- Note: Addresses will be stored in notes for now since there's no address field

-- ============================================
-- HOUSEHOLDS (Grouped by last name + address)
-- ============================================

-- Pinto Ramirez Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Pinto Ramirez Family', 'Colombia', 'Spanish', '2022-01-01', '2 Hillcrest Ct. Augusta, ME 04330; 3 in household')
ON CONFLICT DO NOTHING;

-- Amaral Mabaila Family (separate unit from Malengue Family at same address)
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Amaral Mabaila Family', 'Angola', 'Portuguese', '2019-01-01', '147 Eastern Ave. #1, Augusta, ME 04330; 7 in household')
ON CONFLICT DO NOTHING;

-- Jasim Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Jasim Family', 'Iraq', 'Arabic', '2022-01-01', '2 Mayflower, Augusta, ME 04330; 7 in household')
ON CONFLICT DO NOTHING;

-- Ogal Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Ogal Family', 'Iraq', 'Arabic', '2020-01-01', '16 Sanctuary Lane, Augusta ME 04330; 2 in household')
ON CONFLICT DO NOTHING;

-- Al Horani Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Al Horani Family', 'Syria', 'Arabic', '2024-01-01', '19 Lincoln Augusta ME 04330; 6 in household')
ON CONFLICT DO NOTHING;

-- Suliman/Kasem Family (combined - same address)
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Suliman-Kasem Family', 'Syria', 'Arabic', '2022-01-01', '21 Washington St #1, Augusta, ME 04330; 4 in household')
ON CONFLICT DO NOTHING;

-- Tumer Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Tumer Family', 'Turkey', 'Turkish', '2023-01-01', '20 School House Drive, Farmingdale, ME 04344; 5 in household')
ON CONFLICT DO NOTHING;

-- Oudeh Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Oudeh Family', 'Syria', 'Arabic', '2023-01-01', '89 Mt Vernon Ave, Augusta, ME 04330; 7 in household')
ON CONFLICT DO NOTHING;

-- Note: Kasem Family merged with Suliman Family above (same address)

-- Kemawi Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Kemawi Family', 'Syria', 'Arabic', '2023-01-01', '39 Alexandra Dr, Gardiner ME 04395; 9 in household')
ON CONFLICT DO NOTHING;

-- Almtluk Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Almtluk Family', 'Syria', 'Arabic', '2023-01-01', '166 Mount Vernon Ave #1, Augusta, ME; 10 in household; Moved to Waterville')
ON CONFLICT DO NOTHING;

-- Posso Chavarro Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Posso Chavarro Family', 'Colombia', 'Spanish', '2023-01-01', '37 Pearl St, Augusta, ME 04330; 2 in household')
ON CONFLICT DO NOTHING;

-- Al Kinah/Al Mhina Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Al Kinah Family', 'Syria', 'Arabic', '2023-01-01', '12 Boothby Street, Augusta, ME 04330; 6 in household')
ON CONFLICT DO NOTHING;

-- Harba Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Harba Family', 'Syria', 'Arabic', '2025-01-01', '37 Washington St, Augusta, ME 04330; 6 in household')
ON CONFLICT DO NOTHING;

-- Malengue Family (separate unit from Amaral Mabaila Family at same address)
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Malengue Family', 'Angola', 'Portuguese', '2024-01-01', '147 Eastern Ave #2, Augusta, ME 04330; 5 in household')
ON CONFLICT DO NOTHING;

-- Al Abdoullah Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Al Abdoullah Family', 'Syria', 'Arabic', '2024-01-01', '10 Oxford St #2, Augusta, ME')
ON CONFLICT DO NOTHING;

-- Aldeek Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Aldeek Family', 'Syria', 'Arabic', '2023-01-01', '18 Union St, Hallowell 04347; 7 in household')
ON CONFLICT DO NOTHING;

-- Alzoubi Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Alzoubi Family', 'Syria', 'Arabic', '2023-01-01', '75 Washington St, Augusta, ME 04330; 7 in household')
ON CONFLICT DO NOTHING;

-- Salmhi Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Salmhi Family', 'Syria', 'Arabic', '2024-01-01', '166 Mt Vernon Ave #3, Augusta, ME 04330; 5 in household')
ON CONFLICT DO NOTHING;

-- Zakareya Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Zakareya Family', 'Syria', 'Arabic', '2024-01-01', '4 in household')
ON CONFLICT DO NOTHING;

-- Baher Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Baher Family', 'Syria', 'Arabic', '2022-01-01', '60 Chapel St, Augusta, ME 04330')
ON CONFLICT DO NOTHING;

-- Jama Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Jama Family', 'Syria', 'Arabic', NULL, '91 Glenridge Dr #7, Augusta, ME04330; 4 in household')
ON CONFLICT DO NOTHING;

-- Mohammad Family (Afghanistan)
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Mohammad Family', 'Afghanistan', 'Pashto', '2021-01-01', '4 Woodlawn St, Augusta, ME 04300; 5 in household')
ON CONFLICT DO NOTHING;

-- Harian Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Harian Family', 'Syria', 'Arabic', '2024-01-01', '2 Old Belgrade Rd, Augusta, ME 04370; 5 in household')
ON CONFLICT DO NOTHING;

-- Al Salea Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Al Salea Family', 'Syria', 'Arabic', '2021-01-01', '166 Mt Vernon Ave #2, Augusta, ME 04330; 8 in household')
ON CONFLICT DO NOTHING;

-- Sharif Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Sharif Family', 'Syria', 'Arabic', '2024-01-01', '22 Newland Ave #2, Augusta, ME 04330; 8 in household')
ON CONFLICT DO NOTHING;

-- Mahmood Family (Iraq)
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Mahmood Family', 'Iraq', 'Arabic', '2023-01-01', '96 Glenridge Dr, Augusta, ME 04330')
ON CONFLICT DO NOTHING;

-- Ebengo Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Ebengo Family', 'Congo', 'Swahili', '2023-01-01', '4 Dayton #2, Augusta, ME 04300; 2 in household')
ON CONFLICT DO NOTHING;

-- Nsala Bofaya Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Nsala Bofaya Family', 'Congo', 'French', '2021-01-01', '26 Sewall St. Apt B, Augusta, ME 04330')
ON CONFLICT DO NOTHING;

-- Santoiemma Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Santoiemma Family', 'Mexico', 'Spanish', '2021-01-01', '8 Indian Ridge, Augusta ME 04330')
ON CONFLICT DO NOTHING;

-- Nassara/Tafia Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Nassara Family', 'Syria', 'Arabic', '2024-01-01', '20 Summer St Apt 2, Waterville; 3 in household; Need ride')
ON CONFLICT DO NOTHING;

-- Othman Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Othman Family', 'Syria', 'Arabic', NULL, '4 Stewart Lane Apt 1, Augusta ME; 7 in household; Need Ride')
ON CONFLICT DO NOTHING;

-- Alsuliman Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Alsuliman Family', 'Syria', 'Arabic', '2023-01-01', '12 Boothby St #3 Augusta, ME 04330; 5 in household')
ON CONFLICT DO NOTHING;

-- Sandouk Family
INSERT INTO households (name, country_of_origin, primary_language, date_arrived_us, notes)
VALUES ('Sandouk Family', 'Syria', 'Arabic', '2024-01-01', '37 Eastern Ave #1, Augusta, ME 04330; 4 in household')
ON CONFLICT DO NOTHING;


-- ============================================
-- BENEFICIARIES
-- ============================================

-- Miguel Pinto Ramirez
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, is_employed, occupation, relationship_type, household_id)
SELECT 'Miguel', 'Pinto Ramirez', '231-383-0989', 'miguelpinto1555@gmail.com', '2003-06-05', '1-12 Years', 'intermediate', true, 'Student', 'head_of_household', h.id
FROM households h WHERE h.name = 'Pinto Ramirez Family'
ON CONFLICT DO NOTHING;

-- Eunice do Amaral Mabaila
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, is_employed, occupation, relationship_type, household_id)
SELECT 'Eunice', 'do Amaral Mabaila', '832-616-1493', 'euniceamaral2014@gmail.com', '1982-03-13', 'College', 'intermediate', true, 'Housekeeping', 'head_of_household', h.id
FROM households h WHERE h.name = 'Amaral Mabaila Family'
ON CONFLICT DO NOTHING;

-- Nawal Jasim
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Nawal', 'Jasim', '207-624-1653', '1976-04-05', '1-12 Years', 'intermediate', 'head_of_household', h.id
FROM households h WHERE h.name = 'Jasim Family'
ON CONFLICT DO NOTHING;

-- Noof Zaal Ogal
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Noof Zaal', 'Ogal', '207-441-9490', '1984-01-01', '1-12 Years', 'intermediate', 'head_of_household', h.id
FROM households h WHERE h.name = 'Ogal Family'
ON CONFLICT DO NOTHING;

-- Sameen Al Horani
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, is_employed, occupation, relationship_type, household_id)
SELECT 'Sameen', 'Al Horani', '269-341-1254', '1981-01-01', '1-12 Years', 'intermediate', true, 'Student', 'head_of_household', h.id
FROM households h WHERE h.name = 'Al Horani Family'
ON CONFLICT DO NOTHING;

-- Maisoun Al Horani
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Maisoun', 'Al Horani', '269-290-5896', '1981-05-19', '1-12 Years', 'intermediate', 'spouse', h.id
FROM households h WHERE h.name = 'Al Horani Family'
ON CONFLICT DO NOTHING;

-- Esraa Mohammad Suliman
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Esraa Mohammad', 'Suliman', '207-318-2504', '1994-01-01', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Suliman-Kasem Family'
ON CONFLICT DO NOTHING;

-- Nurvet Tumer
INSERT INTO beneficiaries (first_name, last_name, date_of_birth, education_level, english_proficiency, is_employed, occupation, relationship_type, household_id)
SELECT 'Nurvet', 'Tumer', '1999-11-27', 'College', 'basic', true, 'Au Pair', 'head_of_household', h.id
FROM households h WHERE h.name = 'Tumer Family'
ON CONFLICT DO NOTHING;

-- Osama Oudeh
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Osama', 'Oudeh', '207-468-8030', '1986-05-06', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Oudeh Family'
ON CONFLICT DO NOTHING;

-- Khaled Mahmoude Kasem
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Khaled Mahmoude', 'Kasem', '207-318-2504', '1983-06-18', 'College', 'intermediate', 'spouse', h.id
FROM households h WHERE h.name = 'Suliman-Kasem Family'
ON CONFLICT DO NOTHING;

-- Abdul Ghani Kemawi
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, relationship_type, household_id)
SELECT 'Abdul Ghani', 'Kemawi', '813-546-6666', '1970-08-01', 'head_of_household', h.id
FROM households h WHERE h.name = 'Kemawi Family'
ON CONFLICT DO NOTHING;

-- Ghusonal Almtluk
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, relationship_type, household_id)
SELECT 'Ghusonal', 'Almtluk', '207-346-0254', '1982-07-01', 'head_of_household', h.id
FROM households h WHERE h.name = 'Almtluk Family'
ON CONFLICT DO NOTHING;

-- Luz Adriana Cardona Orozco
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Luz Adriana', 'Cardona Orozco', '207-615-6460', '1979-08-02', 'Graduate School', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Posso Chavarro Family'
ON CONFLICT DO NOTHING;

-- Mauricio Posso Chavarro
INSERT INTO beneficiaries (first_name, last_name, phone, english_proficiency, relationship_type, household_id)
SELECT 'Mauricio', 'Posso Chavarro', '207-699-8833', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Posso Chavarro Family'
ON CONFLICT DO NOTHING;

-- Muwafak Al kinah
INSERT INTO beneficiaries (first_name, last_name, phone, email, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Muwafak', 'Al kinah', '207-855-3859', 'almhynhmwfq@gmail.com', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Al Kinah Family'
ON CONFLICT DO NOTHING;

-- Dareen Al Kinah
INSERT INTO beneficiaries (first_name, last_name, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Dareen', 'Al Kinah', '1990-01-01', '1-12 Years', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Al Kinah Family'
ON CONFLICT DO NOTHING;

-- Naraman Al Niseraila
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Naraman', 'Al Niseraila', '207-530-2385', '1994-10-01', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Harba Family'
ON CONFLICT DO NOTHING;

-- Amer M Harba
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Amer M', 'Harba', '267-314-6636', 'hirbaamr9@gmail.com', '1994-03-01', '1-12 Years', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Harba Family'
ON CONFLICT DO NOTHING;

-- Filipina Malengue
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Filipina', 'Malengue', '857-707-2034', 'filipinamalengue@gmail.com', '1984-04-24', 'College', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Malengue Family'
ON CONFLICT DO NOTHING;

-- Jawdat Al Abdoullah
INSERT INTO beneficiaries (first_name, last_name, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Jawdat', 'Al Abdoullah', '1981-08-02', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Al Abdoullah Family'
ON CONFLICT DO NOTHING;

-- Sumayya Al Saleh
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Sumayya', 'Al Saleh', '207-352-9425', '1992-03-17', '1-12 Years', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Al Abdoullah Family'
ON CONFLICT DO NOTHING;

-- Amir Aldeek
INSERT INTO beneficiaries (first_name, last_name, phone, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Amir', 'Aldeek', '207-899-8314', '1-12 Years', 'none', 'head_of_household', h.id
FROM households h WHERE h.name = 'Aldeek Family'
ON CONFLICT DO NOTHING;

-- Tamador Taqtaq
INSERT INTO beneficiaries (first_name, last_name, phone, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Tamador', 'Taqtaq', '207-624-1630', '1-12 Years', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Aldeek Family'
ON CONFLICT DO NOTHING;

-- Maha Alzoubi
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Maha', 'Alzoubi', '207-592-6735', '1985-08-10', '1-12 Years', 'intermediate', 'head_of_household', h.id
FROM households h WHERE h.name = 'Alzoubi Family'
ON CONFLICT DO NOTHING;

-- Sami Salmhi
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Sami', 'Salmhi', '207-345-8278', '1980-01-01', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Salmhi Family'
ON CONFLICT DO NOTHING;

-- Yasmin Al Aslamhi
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Yasmin', 'Al Aslamhi', '207-345-8278', '1989-01-01', '1-12 Years', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Salmhi Family'
ON CONFLICT DO NOTHING;

-- Abdulrahman Zakareya
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Abdulrahman', 'Zakareya', '207-599-6812', '1997-01-01', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Zakareya Family'
ON CONFLICT DO NOTHING;

-- Bakri Baher
INSERT INTO beneficiaries (first_name, last_name, phone, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Bakri', 'Baher', '207-615-6408', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Baher Family'
ON CONFLICT DO NOTHING;

-- Mohammad Jama
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, is_employed, employer_name, relationship_type, household_id)
SELECT 'Mohammad', 'Jama', '813-820-2009', '1996-09-03', '1-12 Years', 'basic', true, 'Walmart', 'head_of_household', h.id
FROM households h WHERE h.name = 'Jama Family'
ON CONFLICT DO NOTHING;

-- Haji Mohammad
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, is_employed, occupation, relationship_type, household_id)
SELECT 'Haji', 'Mohammad', '207-855-1911', 'hajimohammadehsan16@gmail.com', '1999-06-11', '1-12 Years', 'intermediate', true, 'Dishwasher', 'head_of_household', h.id
FROM households h WHERE h.name = 'Mohammad Family'
ON CONFLICT DO NOTHING;

-- Rami Harian
INSERT INTO beneficiaries (first_name, last_name, english_proficiency, relationship_type, household_id)
SELECT 'Rami', 'Harian', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Harian Family'
ON CONFLICT DO NOTHING;

-- Mahdia Rajab
INSERT INTO beneficiaries (first_name, last_name, english_proficiency, relationship_type, household_id)
SELECT 'Mahdia', 'Rajab', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Harian Family'
ON CONFLICT DO NOTHING;

-- Farhan Harian
INSERT INTO beneficiaries (first_name, last_name, relationship_type, household_id)
SELECT 'Farhan', 'Harian', 'child', h.id
FROM households h WHERE h.name = 'Harian Family'
ON CONFLICT DO NOTHING;

-- Mustafa Al Salea
INSERT INTO beneficiaries (first_name, last_name, phone, english_proficiency, relationship_type, household_id)
SELECT 'Mustafa', 'Al Salea', '207-649-4203', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Al Salea Family'
ON CONFLICT DO NOTHING;

-- Najla Sharif
INSERT INTO beneficiaries (first_name, last_name, date_of_birth, english_proficiency, relationship_type, household_id)
SELECT 'Najla', 'Sharif', '1978-01-28', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Sharif Family'
ON CONFLICT DO NOTHING;

-- Mahmoud Sharif
INSERT INTO beneficiaries (first_name, last_name, english_proficiency, relationship_type, household_id)
SELECT 'Mahmoud', 'Sharif', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Sharif Family'
ON CONFLICT DO NOTHING;

-- Hameed Mahmood
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, english_proficiency, relationship_type, household_id)
SELECT 'Hameed', 'Mahmood', '603-717-4580', '1954-07-07', 'intermediate', 'head_of_household', h.id
FROM households h WHERE h.name = 'Mahmood Family'
ON CONFLICT DO NOTHING;

-- Bushra Sefo
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, english_proficiency, relationship_type, household_id)
SELECT 'Bushra', 'Sefo', '603-717-4580', '1960-02-14', 'intermediate', 'spouse', h.id
FROM households h WHERE h.name = 'Mahmood Family'
ON CONFLICT DO NOTHING;

-- Rawaa Mahmood
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, relationship_type, household_id)
SELECT 'Rawaa', 'Mahmood', '603-717-4580', '1989-06-24', 'child', h.id
FROM households h WHERE h.name = 'Mahmood Family'
ON CONFLICT DO NOTHING;

-- Bahelanya Ebengo
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, is_employed, employer_name, relationship_type, household_id)
SELECT 'Bahelanya', 'Ebengo', '207-699-7190', 'ebengobahelanya@gmail.com', '1993-06-16', '1-12 Years', 'intermediate', true, 'Lowes', 'head_of_household', h.id
FROM households h WHERE h.name = 'Ebengo Family'
ON CONFLICT DO NOTHING;

-- Tania Nsala Bofaya
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Tania', 'Nsala Bofaya', '203-383-3247', '1991-11-13', 'Graduate School', 'intermediate', 'head_of_household', h.id
FROM households h WHERE h.name = 'Nsala Bofaya Family'
ON CONFLICT DO NOTHING;

-- Guadalupe Santoiemma
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Guadalupe', 'Santoiemma', '619-781-3588', 'herdezluex@gmail.com', '1983-12-17', 'Graduate School', 'intermediate', 'head_of_household', h.id
FROM households h WHERE h.name = 'Santoiemma Family'
ON CONFLICT DO NOTHING;

-- Baraem Mahmoud Nassara
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Baraem Mahmoud', 'Nassara', '207-699-9213', 'baraemnasera@gmail.com', '1967-01-11', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Nassara Family'
ON CONFLICT DO NOTHING;

-- Mahmoud abd Alhoap Tafia
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, relationship_type, household_id)
SELECT 'Mahmoud abd Alhoap', 'Tafia', '207-835-9265', 'mhmwdtfyt528@gmail.com', '1967-12-01', '1-12 Years', 'spouse', h.id
FROM households h WHERE h.name = 'Nassara Family'
ON CONFLICT DO NOTHING;

-- Shaemya Tafia
INSERT INTO beneficiaries (first_name, last_name, date_of_birth, is_employed, occupation, relationship_type, household_id)
SELECT 'Shaemya', 'Tafia', '2009-02-23', true, 'Student', 'child', h.id
FROM households h WHERE h.name = 'Nassara Family'
ON CONFLICT DO NOTHING;

-- Saliha Othman
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Saliha', 'Othman', '207-352-9480', 'mo7836480@gmail.com', '1980-02-08', '1-12 Years', 'none', 'head_of_household', h.id
FROM households h WHERE h.name = 'Othman Family'
ON CONFLICT DO NOTHING;

-- Ali Osman
INSERT INTO beneficiaries (first_name, last_name, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Ali', 'Osman', '1974-03-01', '1-12 Years', 'none', 'spouse', h.id
FROM households h WHERE h.name = 'Othman Family'
ON CONFLICT DO NOTHING;

-- Ibrahim Othman
INSERT INTO beneficiaries (first_name, last_name, email, date_of_birth, relationship_type, household_id)
SELECT 'Ibrahim', 'Othman', 'ibrahimotnan7@gmail.com', '2003-01-01', 'child', h.id
FROM households h WHERE h.name = 'Othman Family'
ON CONFLICT DO NOTHING;

-- Mohammed Othman
INSERT INTO beneficiaries (first_name, last_name, phone, email, date_of_birth, relationship_type, household_id)
SELECT 'Mohammed', 'Othman', '207-352-9312', 'masml073@gmail.com', '2002-01-30', 'child', h.id
FROM households h WHERE h.name = 'Othman Family'
ON CONFLICT DO NOTHING;

-- Salah Alsuliman
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Salah', 'Alsuliman', '813-403-0304', '1976-07-07', '1-12 Years', 'basic', 'head_of_household', h.id
FROM households h WHERE h.name = 'Alsuliman Family'
ON CONFLICT DO NOTHING;

-- Nahla Alabd Altamer
INSERT INTO beneficiaries (first_name, last_name, phone, date_of_birth, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Nahla', 'Alabd Altamer', '813-403-1982', '1982-01-02', '1-12 Years', 'basic', 'spouse', h.id
FROM households h WHERE h.name = 'Alsuliman Family'
ON CONFLICT DO NOTHING;

-- Samah Khounda
INSERT INTO beneficiaries (first_name, last_name, phone, email, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Samah', 'Khounda', '207-215-5701', 'smahkalil5@gmail.com', '1-12 Years', 'none', 'head_of_household', h.id
FROM households h WHERE h.name = 'Sandouk Family'
ON CONFLICT DO NOTHING;

-- Abdul Whab Sandouk
INSERT INTO beneficiaries (first_name, last_name, phone, email, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Abdul Whab', 'Sandouk', '207-215-5701', 'smahkalil5@gmail.com', '1-12 Years', 'none', 'spouse', h.id
FROM households h WHERE h.name = 'Sandouk Family'
ON CONFLICT DO NOTHING;

-- Sham Sandouk
INSERT INTO beneficiaries (first_name, last_name, phone, email, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Sham', 'Sandouk', '207-215-5701', 'smahkalil5@gmail.com', '1-12 Years', 'none', 'child', h.id
FROM households h WHERE h.name = 'Sandouk Family'
ON CONFLICT DO NOTHING;

-- Ali Sandouk
INSERT INTO beneficiaries (first_name, last_name, phone, email, education_level, english_proficiency, relationship_type, household_id)
SELECT 'Ali', 'Sandouk', '207-215-5701', 'smahkalil5@gmail.com', '1-12 Years', 'none', 'child', h.id
FROM households h WHERE h.name = 'Sandouk Family'
ON CONFLICT DO NOTHING;


-- ============================================
-- DEDUPLICATION CHECK
-- ============================================

-- Check for duplicate beneficiaries by name within same household
-- These would need manual review if found
SELECT 'Potential duplicate beneficiaries:' as warning,
       first_name, last_name, household_id, COUNT(*)
FROM beneficiaries
GROUP BY first_name, last_name, household_id
HAVING COUNT(*) > 1;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 'Households created:' as info, COUNT(*) as count FROM households
UNION ALL
SELECT 'Beneficiaries created:', COUNT(*) FROM beneficiaries;
