# SplitBill: the 12 planted rejection causes (trap version)
iOS
T1 Camera used (AVCaptureDevice) but no NSCameraUsageDescription in Info.plist (Apple 5.1.1)
T2 UserDefaults (required-reason API) used, no PrivacyInfo.xcprivacy (privacy manifest, enforced since 1 May 2024)
T3 Sign-in but no in-app account deletion (Apple 5.1.1(v), since 30 Jun 2022)
T4 Google is the only login, no Sign in with Apple or equivalent privacy login (Apple 4.8)
T5 Digital Premium unlock sold through a Razorpay payment link, not In-App Purchase (Apple 3.1.1)
T6 Receipt photo sent to OpenAI with no consent naming the provider (Apple 5.1.2(i))
T7 Release config points at a staging backend (Apple 2.1)
T8 IDFA read with no App Tracking Transparency prompt (Apple 5.1.2)
Android
A1 targetSdk 34, below Google Play's target API requirement
A2 READ_SMS / RECEIVE_SMS without being the default SMS app (Play SMS and Call Log policy)
A3 No in-app account deletion (Play account deletion requirement)
A4 Receipt photo sent to a third-party AI with no prominent disclosure (Play User Data policy)

The clean version fixes all 12 (Info.plist purpose string + export key, PrivacyInfo.xcprivacy, delete-account flow on both platforms, Sign in with Apple, StoreKit Product.purchase, OpenAI consent alerts on both platforms, production API URL, IDFA removed, targetSdk 36, SMS permissions removed, privacy policy links, R8 on).
