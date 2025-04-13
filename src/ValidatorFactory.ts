import { IValidator } from './IValidator';
import { LimitToSingleFolderValidator } from './Validators/LimitToSingleFolderValidator';
import { FolderNameValidator } from './Validators/FolderNameValidator';
import { IValidationRule } from './IValidationRule';
import { IFolderNameRule } from './IFolderNameRule';

export class ValidatorFactory {
    static createValidator(
        ruleName: string,
        ruleConfig: IValidationRule | IFolderNameRule,
        context: any
    ): IValidator | null {
        switch (ruleName) {
            case 'limitToSingleFolder':
                return new LimitToSingleFolderValidator(
                    context.files,
                    context.samplesFolder,
                    context.sampleFolders
                );
            case 'folderName':
                return new FolderNameValidator(
                    ruleConfig as IFolderNameRule,
                    context.sampleName
                );
            default:
                return null; // Unknown rule
        }
    }
}