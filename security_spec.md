# Security Specification & Data Invariants for CampusRunner

This document outlines the security architecture for the Firebase Firestore Rules.

## 1. Data Invariants

1. **User Identity Isolation**: A user can only access or modify their own user document under `/users/{userId}`.
2. **Access Control (RBAC)**: Only users verified as `"runner"` or explicitly having the admin identity can see all errands. Students can only view their own posted errands.
3. **No Role Escalation**: Students are strictly forbidden from modifying their own `role` field or changing it to `"runner"`.
4. **Fulfillment Isolation**: On updating errands, students cannot modify status fields. Only runners can change an errand's status through actions like `Accepted`, `Shopping`, `On the way`, and `Delivered`.
5. **No Maps / GPS Poisoning**: The app disables GPS/maps, safeguarding against coordinate injection attacks.

## 2. The "Dirty Dozen" Payloads (Attacks to Block)

1. **Self-Escalation**: User `student_123` tries to change their own role to `"runner"`.
2. **Spying on Errands**: User `student_abc` tries to view the errand collection lists of `student_xyz`.
3. **Ghost E-commerce**: Users try to create an Errand with an ID that has invalid characters.
4. **State Jumping**: Student tries to transition an errand straight from `Pending` to `Delivered` bypassing accepted.
5. **Admin Spoofing**: Attempt to access the runner dashboard routes or fetch all pending orders without having the `"runner"` role in their User record.
6. **Immutable Tampering**: Attempting to rewrite `createdAt` on an existing Errand document during status updating.
7. **Budget Bypass**: Setting an irrational negative budget value on errand creation.
8. **Malicious Coords**: Attempting to inject coordinate data into errands (which are restricted under "NO maps" rules).
9. **Spam Fields**: Trying to write a document with custom keys like `isApprovedBySystem: true`.
10. **Identity Theft**: Trying to post an errand with `userId` of another student.
11. **Impersonate Agent**: Attempting to alter a student's errand as another student.
12. **Denial of Wallet**: Attempting to inject a huge 10MB string description to exhaust database storage space.
