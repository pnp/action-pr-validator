import { ReadmeStructureValidator } from './Validators/ReadmeStructureValidator';
import { RequireVisitorStatsValidator } from './Validators/RequiredVisitorStatsValidator';
import { IValidator } from './IValidator';
import { LimitToSingleFolderValidator } from './Validators/LimitToSingleFolderValidator';
import { FolderNameValidator } from './Validators/FolderNameValidator';

export const ValidatorRegistry: { [ruleName: string]: new (...args: any[]) => IValidator } = {
    limitToSingleFolder: LimitToSingleFolderValidator,
    folderName: FolderNameValidator,
    requireVisitorStats: RequireVisitorStatsValidator,
    readmeStructure: ReadmeStructureValidator,

};