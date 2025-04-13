import { IValidationRule } from "./IValidationRule";


export interface IFolderNameRule extends IValidationRule {
    acceptedFolders?: string[];
}
