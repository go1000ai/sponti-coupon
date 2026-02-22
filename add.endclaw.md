# SpontiCoupon — Upcoming Features & Notes

## Multiple Redemption Methods (TODO)

Customers need flexibility in how they redeem their Sponti Coupon before expiration. The 6-digit code system supports all of these methods — the vendor decides which ones they accept.

### Redemption Paths

1. **In-Person Redemption**
   - Customer visits the venue
   - Shows their 6-digit code or QR code to the vendor
   - Vendor enters the code on the scan page → remaining balance is displayed
   - Customer pays the remaining balance on the spot

2. **Phone Redemption**
   - Customer calls the vendor before the deal expires
   - Reads their 6-digit redemption code over the phone
   - Vendor enters the code on the scan page to verify and redeem
   - Payment arrangement is made between customer and vendor (e.g., pay on arrival, phone payment)

3. **Remote / Pay-Out Redemption**
   - Customer pays the remaining balance remotely and redeems the coupon without visiting in person
   - The coupon code is given to the vendor to complete the redemption
   - Useful for delivery, gift purchases, or scheduling future services

### Vendor Configuration (To Build)
- Each vendor should be able to toggle which redemption methods they accept:
  - [ ] In-person only
  - [ ] Phone + in-person
  - [ ] Remote pay-out + in-person
  - [ ] All methods
- This setting should be visible on the deal detail page so customers know their options before claiming

### Tutorial / How-It-Works (To Create)
- Build a visual tutorial/guide page explaining the different redemption methods
- Include step-by-step instructions for both customers and vendors
- Could be a dedicated `/how-to-redeem` page or an expandable section on the deal detail page
- Consider adding a short animated walkthrough or illustrated steps
- Topics to cover:
  - How to find your 6-digit code (My Deals page)
  - How to redeem in person (show code → vendor scans → pay remaining balance)
  - How to redeem over the phone (call vendor → read code → arrange payment)
  - How to redeem remotely (pay remaining balance → give code to vendor)
  - What happens if the deal expires before redemption (deposit is non-refundable)
  - Safety reminder: never rush to meet a deadline — your safety comes first
