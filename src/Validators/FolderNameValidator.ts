import { IValidator } from '../IValidator';
import { IValidationResult } from '../IValidationResult';
import { IFolderNameRule } from '../IFolderNameRule';
import { minimatch } from 'minimatch';

export class FolderNameValidator implements IValidator {
    constructor(
        private rule: IFolderNameRule,
        private context: { sampleName: string }
    ) { }

    name = 'folderName'; 

    async validate(): Promise<IValidationResult> {
        const { sampleName } = this.context;
        const acceptedFolders = this.rule.acceptedFolders || [];
        const isValidSampleName = acceptedFolders.some(pattern => minimatch(sampleName, pattern));

        return {
            success: isValidSampleName,
            rule: this.rule.rule,
            href: this.rule.href,
            order: this.rule.order,
        };
    }
}