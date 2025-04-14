import { IValidator } from '../IValidator';
import { IValidationResult } from '../IValidationResult';
import { IValidationRule } from '../IValidationRule';

export class LimitToSingleFolderValidator implements IValidator {
    constructor(
        private rule: IValidationRule,
        private context: { files: string[]; samplesFolder: string; sampleFolders: Set<string> }
    ) { }

    name = 'limitToSingleFolder'; 
    
    async validate(): Promise<IValidationResult> {
        const { files, samplesFolder, sampleFolders } = this.context;
        const filesOutsideSamples = files.filter(f => !f.startsWith(`${samplesFolder}/`));
        const onlyOneFolder = sampleFolders.size === 1 && filesOutsideSamples.length === 0;

        return {
            success: onlyOneFolder,
            rule: this.rule.rule,
            href: this.rule.href,
            order: this.rule.order,
        };
    }
}