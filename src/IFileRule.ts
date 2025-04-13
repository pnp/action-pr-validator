import { IValidationRule } from "./IValidationRule";

export interface IFileRule extends IValidationRule{
    require?: string;
    forbid?: string;
}
