# Popup Functionality Test Scenarios

## Test Cases for Duplicate Detection and Success Messages

### Scenario 1: Duplicate User Detection
**Expected Behavior:**
- User submits form with existing Passport Number/Aadhaar Number/PAN Number
- System shows popup: "User already exists" with detailed error message
- Form data is NOT cleared (user can modify and retry)
- Red/destructive toast notification appears

**Test Steps:**
1. Fill form with existing Passport Number (e.g., "A1234567")
2. Submit the form
3. Verify popup shows: "User already exists - Duplicate Passport Number found: A1234567"
4. Verify form fields are still populated
5. Verify toast has destructive (red) styling

### Scenario 2: Successful Record Save
**Expected Behavior:**
- User submits form with new/unique data
- System shows popup: "Record saved successfully"
- Form data is cleared
- Green/success toast notification appears

**Test Steps:**
1. Fill form with unique Passport Number, Aadhaar Number, and PAN Number
2. Submit the form
3. Verify popup shows: "Record saved successfully - New record has been saved to the Excel file"
4. Verify all form fields are cleared
5. Verify toast has default (green) styling

### Scenario 3: Record Update (Existing Sequence)
**Expected Behavior:**
- User updates existing record (sequence > 0)
- System shows popup: "Record saved successfully"
- Form data is cleared
- Success toast notification appears

**Test Steps:**
1. Search for existing record and select it (sets sequence > 0)
2. Modify some fields
3. Submit the form
4. Verify popup shows: "Record saved successfully - Row #X updated successfully"
5. Verify all form fields are cleared

### Scenario 4: Other Submission Errors
**Expected Behavior:**
- User encounters other errors (payment, network, etc.)
- System shows popup: "Submit failed" with error details
- Form data is NOT cleared
- Red/destructive toast notification appears

**Test Steps:**
1. Fill form with valid data
2. Simulate network error or payment failure
3. Verify popup shows: "Submit failed" with specific error
4. Verify form fields remain populated

## Implementation Details

### Toast Configuration
- **Success Toast**: Default variant (green background)
- **Duplicate Toast**: Destructive variant (red background)
- **Error Toast**: Destructive variant (red background)

### Form Clearing Logic
- **Success**: All form fields cleared, sequence reset, results cleared
- **Duplicate**: No form clearing (user can retry)
- **Error**: No form clearing (user can retry)

### Error Handling
- HTTP 409 (Conflict): Treated as duplicate user
- Other HTTP errors: Treated as general submission failure
- Network errors: Caught and displayed as generic error