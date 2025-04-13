export interface IValidator {
    validate(): Promise<boolean>;
}
