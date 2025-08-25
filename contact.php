<?php
header('Content-Type: application/json; charset=utf-8');

// CONFIG: set recipient email
$to = 'you@example.com'; // TODO: change to your email address
$subject = 'New inquiry from photographer website';

// Simple CORS allow same-origin; adjust if needed
header('Access-Control-Allow-Origin: *');

function respond($ok, $message){
  echo json_encode(['success'=>$ok, 'message'=>$message]);
  exit;
}

// Read POST
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$message = trim($_POST['message'] ?? '');
$lang = $_POST['lang'] ?? 'en';

// Localized messages fallback
$messages = [
  'en' => [
    'success' => 'Thanks! Your message has been sent.',
    'invalid' => 'Please complete all required fields correctly.',
    'error' => 'Something went wrong. Please try again.'
  ],
  'ar' => [
    'success' => 'شكرًا! تم إرسال رسالتك.',
    'invalid' => 'يرجى إكمال الحقول المطلوبة بشكل صحيح.',
    'error' => 'حدث خطأ ما. حاول مرة أخرى.'
  ]
];

$M = $messages[$lang] ?? $messages['en'];

// Validate
if($name === '' || $message === '') respond(false, $M['invalid']);
if(!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, $M['invalid']);

// Compose email
$body = "Name: $name\nEmail: $email\nPhone: $phone\n\nMessage:\n$message\n";
$headers = 'From: '.$email."\r\n".
           'Reply-To: '.$email."\r\n".
           'X-Mailer: PHP/'.phpversion();

// Send
$sent = @mail($to, $subject, $body, $headers);
if($sent){
  respond(true, $M['success']);
} else {
  respond(false, $M['error']);
}
