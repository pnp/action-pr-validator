import { IValidator } from '../IValidator';

export class LimitToSingleFolderValidator implements IValidator {
    constructor(
        private files: string[],
        private samplesFolder: string,
        private sampleFolders: Set<string>
    ) { }

    async validate(): Promise<boolean> {
        const filesOutsideSamples = this.files.filter(f => !f.startsWith(`${this.samplesFolder}/`));
        const onlyOneFolder = this.sampleFolders.size === 1 && filesOutsideSamples.length === 0;

        return  onlyOneFolder;
    }
}