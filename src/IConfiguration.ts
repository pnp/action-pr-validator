import { IFileRule } from "./IFileRule";
import { IFolderNameRule } from "./IFolderNameRule";
import { IValidationRule } from "./IValidationRule";

export interface IConfiguration {
    templateLines: string[];
    contributionsFolder?:        string;
    rules: {
        [ruleName: string]: IValidationRule | IFolderNameRule;
    };
    fileRules?: IFileRule[];
}


