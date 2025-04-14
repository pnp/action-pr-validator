import { IValidationNote } from './IValidationNote';
export interface IValidationResult {
    success: boolean; // Overall success of the validation
    rule: string; // Rule name
    href: string; // Link to the rule documentation
    order?: number; // Order of the rule
    notes?: IValidationNote[]; // List of validation notes
}