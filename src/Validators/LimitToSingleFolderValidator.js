"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LimitToSingleFolderValidator = void 0;
class LimitToSingleFolderValidator {
    constructor(rule, context) {
        this.rule = rule;
        this.context = context;
    }
    validate() {
        return __awaiter(this, void 0, void 0, function* () {
            const { files, samplesFolder, sampleFolders } = this.context;
            const filesOutsideSamples = files.filter(f => !f.startsWith(`${samplesFolder}/`));
            const onlyOneFolder = sampleFolders.size === 1 && filesOutsideSamples.length === 0;
            return {
                success: onlyOneFolder,
                rule: this.rule.rule,
                href: this.rule.href,
                order: this.rule.order,
            };
        });
    }
}
exports.LimitToSingleFolderValidator = LimitToSingleFolderValidator;
