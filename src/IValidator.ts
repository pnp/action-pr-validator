import { IValidationResult } from './IValidationResult';

export interface IValidator {
    validate(): Promise<IValidationResult>;
    name: string;
}