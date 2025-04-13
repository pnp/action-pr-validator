import { IValidator } from '../IValidator';
import { IFolderNameRule } from '../IFolderNameRule';
import { minimatch } from 'minimatch';

export class FolderNameValidator implements IValidator {
    constructor(
        private rule: IFolderNameRule,
        private sampleName: string
    ) { }

    async validate(): Promise<boolean> {
        const acceptedFolders = this.rule.acceptedFolders || [];
        const isValidSampleName = acceptedFolders.some(pattern => minimatch(this.sampleName, pattern));

        return isValidSampleName
    }
}