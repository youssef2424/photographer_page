<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// CONFIG: Set your business email address
$to = 'youssefgerges103@email.com'; // TODO: Change to your actual business email

function respond($ok, $message){
  echo json_encode(['success'=>$ok, 'message'=>$message]);
  exit;
}

// Read JSON input
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Extract fields
$couple_names = trim($data['couple_names'] ?? '');
$wedding_date = trim($data['wedding_date'] ?? '');
$location = trim($data['location'] ?? '');
$phone = trim($data['phone'] ?? '');
$email = trim($data['email'] ?? '');
$message = trim($data['message'] ?? '');

// Validate required fields
if(empty($couple_names) || empty($wedding_date) || empty($location) || empty($phone) || empty($email) || empty($message)){
  respond(false, 'Please complete all required fields.');
}

// Validate email format
if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
  respond(false, 'Please enter a valid email address.');
}

// Validate phone (basic check)
if(!preg_match('/^[\d\s\-\+\(\)]+$/', $phone) || strlen($phone) < 10){
  respond(false, 'Please enter a valid phone number.');
}

// Compose email subject and body
$subject = "Wedding Inquiry - $couple_names";

$body = "New Wedding Inquiry\n\n";
$body .= "Couple Names: $couple_names\n";
$body .= "Wedding/Session Date: $wedding_date\n";
$body .= "Location: $location\n";
$body .= "Phone: $phone\n";
$body .= "Email: $email\n\n";
$body .= "Message:\n$message\n\n";
$body .= "---\n";
$body .= "Sent from photographer website contact form\n";
$body .= "Date: " . date('Y-m-d H:i:s') . "\n";

// Email headers
$headers = "From: $email\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "Content-Type: text/plain; charset=utf-8\r\n";

// Send email
$sent = @mail($to, $subject, $body, $headers);

if($sent){
  respond(true, 'Thank you! Your message has been sent successfully. We\'ll get back to you soon!');
} else {
  respond(false, 'Sorry, there was an error sending your message. Please try again or contact us directly.');
}
