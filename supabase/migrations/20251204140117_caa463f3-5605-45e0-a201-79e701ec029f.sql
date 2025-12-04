INSERT INTO vendor_requests (vendor_name, vendor_email, expected_spending, status, payment_terms)
VALUES ('ספק בדיקה', 'test@example.com', 1000, 'with_vendor', 'שוטף + 60')
RETURNING id, secure_token, vendor_name