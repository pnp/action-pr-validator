"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorRegistry = void 0;
const ReadmeStructureValidator_1 = require("./Validators/ReadmeStructureValidator");
const RequiredVisitorStatsValidator_1 = require("./Validators/RequiredVisitorStatsValidator");
const LimitToSingleFolderValidator_1 = require("./Validators/LimitToSingleFolderValidator");
const FolderNameValidator_1 = require("./Validators/FolderNameValidator");
exports.ValidatorRegistry = {
    limitToSingleFolder: LimitToSingleFolderValidator_1.LimitToSingleFolderValidator,
    folderName: FolderNameValidator_1.FolderNameValidator,
    requireVisitorStats: RequiredVisitorStatsValidator_1.RequireVisitorStatsValidator,
    readmeStructure: ReadmeStructureValidator_1.ReadmeStructureValidator,
};
