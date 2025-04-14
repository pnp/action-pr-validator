export interface IValidationNote {
    file: string; // File being validated
    location?: string; // Location in the file (e.g., Line XX, Column YY)
    severity: 'Warning' | 'Suggestion'; // Severity of the issue
    rule: string; // Rule name
    message: string; // Validation message
}
