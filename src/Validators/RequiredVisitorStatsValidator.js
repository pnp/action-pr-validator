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
exports.RequireVisitorStatsValidator = void 0;
class RequireVisitorStatsValidator {
    constructor(rule, context) {
        this.rule = rule;
        this.context = context;
    }
    validate() {
        return __awaiter(this, void 0, void 0, function* () {
            const { octokit, owner, repo, sampleFiles, samplesFolder, sampleName, prSha } = this.context;
            const readmeFile = sampleFiles.find(f => f === `${samplesFolder}/${sampleName}/README.md`);
            const hasReadme = readmeFile !== undefined;
            let hasImageTracker = false;
            if (hasReadme) {
                try {
                    const { data } = yield octokit.rest.repos.getContent({
                        owner,
                        repo,
                        path: readmeFile,
                        ref: prSha,
                    });
                    if (data && 'content' in data) {
                        const readmeContent = Buffer.from(data.content, 'base64').toString('utf8');
                        const lines = readmeContent.split('\n');
                        hasImageTracker = lines.some(line => line.trim().startsWith('<img src="https://m365-visitor-stats.azurewebsites.net/'));
                    }
                }
                catch (error) {
                    console.warn(`Error reading README.md: ${error}`);
                }
            }
            return {
                success: hasImageTracker,
                rule: this.rule.rule,
                href: this.rule.href,
                order: this.rule.order,
            };
        });
    }
}
exports.RequireVisitorStatsValidator = RequireVisitorStatsValidator;
