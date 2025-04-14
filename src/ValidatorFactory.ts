import { ValidatorRegistry } from './ValidatorRegistry';
import { IValidator } from './IValidator';
import { IValidationRule } from './IValidationRule';
import { IFolderNameRule } from './IFolderNameRule';

export class ValidatorFactory {
    static createValidator(
        ruleName: string,
        ruleConfig: IValidationRule | IFolderNameRule,
        context: any
    ): IValidator | null {
        const ValidatorClass = ValidatorRegistry[ruleName];
        if (!ValidatorClass) {
            return null; // Unknown rule
        }

        // Dynamically instantiate the validator with the required dependencies
        return new ValidatorClass(ruleConfig, context);
    }
}