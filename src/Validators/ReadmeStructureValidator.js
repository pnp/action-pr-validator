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
exports.ReadmeStructureValidator = void 0;
class ReadmeStructureValidator {
    constructor(rule, context, logger // Logger interface
    ) {
        this.rule = rule;
        this.context = context;
        this.logger = logger;
        this.name = 'ReadmeStructure'; // Name of the validator
    }
    validate() {
        return __awaiter(this, void 0, void 0, function* () {
            const { octokit, owner, repo, sampleFiles, samplesFolder, sampleName, prSha } = this.context;
            const readmeFile = sampleFiles.find(f => f === `${samplesFolder}/${sampleName}/README.md`);
            const hasReadme = readmeFile !== undefined;
            const notes = [];
            let isValidStructure = false;
            if (hasReadme) {
                try {
                    this.logger.info(`Found README.md at path: ${readmeFile}`);
                    const { data } = yield octokit.rest.repos.getContent({
                        owner,
                        repo,
                        path: readmeFile,
                        ref: prSha,
                    });
                    if (data && 'content' in data) {
                        const readmeContent = Buffer.from(data.content, 'base64').toString('utf8');
                        const lines = readmeContent.split('\n');
                        // Extract headers from the markdown file
                        const headers = lines
                            .filter(line => line.startsWith('#')) // Markdown headers start with '#'
                            .map(line => {
                            var _a;
                            return ({
                                level: ((_a = line.match(/^#+/)) === null || _a === void 0 ? void 0 : _a[0].length) || 0, // Count the number of '#' for the level
                                title: line.replace(/^#+\s*/, '').trim(), // Remove '#' and trim whitespace
                            });
                        })
                            .filter(header => {
                            // If maxValidation is specified, only include headers up to that level
                            return this.rule.maxValidation ? header.level <= this.rule.maxValidation : true;
                        });
                        this.logger.info(`Extracted headers: ${JSON.stringify(headers)}`);
                        // Check if headers match the required structure
                        const requiredHeaders = this.rule.requiredHeaders;
                        isValidStructure = this.validateHeaders(headers, requiredHeaders);
                    }
                }
                catch (error) {
                    this.logger.error(`Error reading README.md: ${error}`);
                }
            }
            else {
                this.logger.warning(`README.md not found in the sample folder: ${samplesFolder}/${sampleName}`);
            }
            // Test note
            notes.push({
                file: readmeFile,
                severity: 'Suggestion',
                location: 'Line 1, Column 1',
                rule: 'duplicate-alt-text',
                message: `Error reading README.md`,
            });
            return {
                success: isValidStructure,
                rule: this.rule.rule,
                href: this.rule.href,
                order: this.rule.order,
                notes
            };
        });
    }
    validateHeaders(headers, requiredHeaders) {
        let index = 0;
        for (const requiredHeader of requiredHeaders) {
            // Find the required header in the headers list starting from the current index
            index = headers.findIndex((header, i) => {
                if (i < index)
                    return false; // Skip headers before the current index
                // Match exact markdown or regex
                if (requiredHeader.regex) {
                    const regex = new RegExp(requiredHeader.regex);
                    return regex.test(`#`.repeat(header.level) + ' ' + header.title);
                }
                return `#`.repeat(header.level) + ' ' + header.title === requiredHeader.markdown;
            });
            if (index === -1) {
                this.logger.warning(`Required header not found: ${requiredHeader.markdown || requiredHeader.regex}`);
                return false; // Required header not found in the correct order
            }
            index++; // Move to the next header
        }
        return true; // All required headers found in the correct order
    }
}
exports.ReadmeStructureValidator = ReadmeStructureValidator;
