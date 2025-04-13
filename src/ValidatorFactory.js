"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorFactory = void 0;
const LimitToSingleFolderValidator_1 = require("./Validators/LimitToSingleFolderValidator");
const FolderNameValidator_1 = require("./Validators/FolderNameValidator");
class ValidatorFactory {
    static createValidator(ruleName, ruleConfig, context) {
        switch (ruleName) {
            case 'limitToSingleFolder':
                return new LimitToSingleFolderValidator_1.LimitToSingleFolderValidator(context.files, context.samplesFolder, context.sampleFolders);
            case 'folderName':
                return new FolderNameValidator_1.FolderNameValidator(ruleConfig, context.sampleName);
            default:
                return null; // Unknown rule
        }
    }
}
exports.ValidatorFactory = ValidatorFactory;
