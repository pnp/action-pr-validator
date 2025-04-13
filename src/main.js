"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const core_1 = require("@actions/core");
const minimatch_1 = require("minimatch");
const handlebars_1 = __importDefault(require("handlebars"));
const ValidatorFactory_1 = require("./ValidatorFactory");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = (0, core_1.getInput)("gh-token");
            if (!token) {
                core.setFailed('GITHUB_TOKEN is not set');
                return;
            }
            core.info('Got token');
            const octokit = github.getOctokit(token);
            core.info('Got oktokit');
            const { context } = github;
            const pr = context.payload.pull_request;
            if (!pr) {
                core.setFailed('This action only runs on pull requests.');
                return;
            }
            core.info('Got PR');
            const { owner, repo } = context.repo;
            const prNumber = pr.number;
            // Get the account name of the author of the PR
            const author = pr.user.login;
            core.info(`PR author: ${author}`);
            // Check for specific tag
            try {
                const { data: labels } = yield octokit.rest.issues.listLabelsOnIssue({
                    owner,
                    repo,
                    issue_number: prNumber,
                });
                core.info('Got labels');
                const skipValidation = labels.some(label => label.name === 'skip-validation');
                if (skipValidation) {
                    core.info('Skipping validation due to "skip-validatation" tag.');
                    return;
                }
            }
            catch (_a) {
            }
            // Read inputs
            core.info('Reading inputs');
            const validationRulesFile = core.getInput('validationRulesFile');
            if (!validationRulesFile) {
                core.setFailed('Validation rules file not set.');
                return;
            }
            else {
                core.info(`Validation rules file: ${validationRulesFile}`);
            }
            // Post comments?
            const postComments = core.getInput('postComment') === 'true';
            // Read validation rules from JSON file
            const configuration = JSON.parse(fs.readFileSync(validationRulesFile, 'utf8'));
            if (!configuration) {
                core.setFailed('Validation rules not found.');
                return;
            }
            core.info('Got rules');
            const samplesFolder = configuration.contributionsFolder || 'samples';
            const rules = configuration.rules;
            // const affectsOnlyOneFolder: IValidationRule = rules["limitToSingleFolder"] || undefined;
            // const sampleFolderNameRule: IFolderNameRule = rules["folderName"] || undefined;
            // const acceptedFolders:string[] = sampleFolderNameRule?.acceptedFolders || [];
            // const requireVisitorStats: IValidationRule = rules["requireVisitorStats"] || false;
            const fileRules = configuration.fileRules || [];
            // const sourceRepo = pr!.head.repo.full_name;
            // const baseRepo = pr!.base.repo.full_name;
            // Get list of files changed in the PR
            const { data: files } = yield octokit.rest.pulls
                .listFiles({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: prNumber,
            });
            core.info('Got files');
            core.info(`PR #${prNumber} has ${files.length} files changed.`);
            for (const file of files) {
                core.info(`- ${file.filename}`);
            }
            // Filter to files under "samples/"
            const sampleFiles = files.map(f => f.filename).filter(f => f.startsWith(`${samplesFolder}/`));
            core.info(`Changed ${sampleFiles.length} files under the "${samplesFolder}" folder.`);
            // Determine the sample folders (considering full path structure)
            const sampleFolders = new Set();
            sampleFiles.forEach(include => {
                const relativePath = path.relative(samplesFolder, include);
                const parts = relativePath.split(path.sep);
                if (parts.length > 0) {
                    sampleFolders.add(parts[0]);
                }
            });
            core.info(`Affected sample folders: ${Array.from(sampleFolders).join(', ')}`);
            // Build validation messages
            const validationResults = new Array();
            // Verify that only one folder is affected
            // if (affectsOnlyOneFolder) {
            //     // Check if there are any files outside the "samples/" folder
            //     const filesOutsideSamples = files.map(f => f.filename).filter(f => !f.startsWith(`${samplesFolder}/`));
            //     if (filesOutsideSamples.length > 0) {
            //         core.info(`Contains files outside the "${samplesFolder}" folder.`);
            //     }
            //     const onlyOneFolder = sampleFolders.size === 1 && filesOutsideSamples.length === 0;
            //     validationResults.push({
            //         success: onlyOneFolder,
            //         rule: affectsOnlyOneFolder.rule,
            //         href: affectsOnlyOneFolder.href,
            //         order: affectsOnlyOneFolder.order,
            //     });
            // }
            // Verify the sample folder name
            const sampleName = Array.from(sampleFolders)[0];
            core.info(`Sample: ${sampleName}`);
            const samplePath = path.join(samplesFolder, sampleName);
            core.info(`Sample folder: ${samplePath}`);
            // if (sampleFolderNameRule) {
            //     // Make sure the sample is named correctly
            //     const isValidSampleName = acceptedFolders.some(pattern => minimatch(sampleName, pattern));
            //     validationResults.push({
            //         success: isValidSampleName,
            //         rule: sampleFolderNameRule.rule,
            //         href: sampleFolderNameRule.href,
            //         order: sampleFolderNameRule.order,
            //     });
            //     core.info(`Sample name is valid: ${isValidSampleName}`);
            // }
            // Validate README.md content
            // if (requireVisitorStats) {
            //     const readmeFile = sampleFiles.find(f => f === path.join(samplesFolder, sampleName, 'README.md'));
            //     const hasReadme = readmeFile !== undefined;
            //     var hasImageTracker = false;
            //     core.info(`README.md exists: ${hasReadme}`);
            //     if (hasReadme) {
            //         try {
            //             const readmeContent = await getFileContent(octokit, owner, repo, readmeFile, pr.head.sha);
            //             if (readmeContent) {
            //                 core.info(`README.md content: ${readmeContent}`);
            //                 const lines = readmeContent.split('\n');
            //                 hasImageTracker = lines.some(line => line.trim().startsWith('<img src="https://m365-visitor-stats.azurewebsites.net/'));
            //                 core.info(`Visitor stats image in README.md: ${hasImageTracker}`);
            //                 validationResults.push({
            //                     success: hasImageTracker,
            //                     rule: requireVisitorStats.rule,
            //                     href: requireVisitorStats.href,
            //                     order: requireVisitorStats.order,
            //                 });
            //             } else {
            //                 core.warning(`Can't read README.md content.`);
            //             }
            //         } catch (error) {
            //             core.warning(`Error reading README.md: ${error}`);
            //         }
            //     }
            // }
            // Combine base branch files with PR files
            const baseBranch = pr.base.ref;
            const baseFiles = yield getBaseBranchFiles(octokit, owner, repo, baseBranch, samplesFolder);
            const combinedFiles = new Set([...baseFiles, ...sampleFiles]);
            core.info(`Combined files for validation: ${Array.from(combinedFiles).join(', ')}`);
            // Dynamically create and execute validators
            for (const [ruleName, ruleConfig] of Object.entries(rules)) {
                const validator = ValidatorFactory_1.ValidatorFactory.createValidator(ruleName, ruleConfig, {
                    files: files.map(f => f.filename),
                    samplesFolder,
                    sampleFolders,
                    sampleName,
                });
                if (validator) {
                    const result = yield validator.validate();
                    validationResults.push({ rule: ruleName, success: result, href: ruleConfig.href, order: ruleConfig.order });
                    core.info(`Validation result for ${ruleName}: ${result}`);
                }
            }
            // Validate files based on rules
            if (fileRules) {
                for (const { require, forbid, rule, href, order } of fileRules) {
                    const pattern = require || forbid;
                    const isExclude = !!forbid;
                    if (!pattern) {
                        core.warning(`Invalid rule: ${rule}`);
                        continue;
                    }
                    const fullPath = path.join(samplesFolder, sampleName, pattern);
                    const fileExists = Array.from(combinedFiles).some(f => (0, minimatch_1.minimatch)(f, fullPath));
                    const isValid = isExclude ? !fileExists : fileExists;
                    core.info(`${rule} exists: ${fileExists} valid: ${isValid}`);
                    validationResults.push({
                        success: isValid,
                        rule,
                        href,
                        order
                    });
                }
            }
            // Set hasIssues based on validationMessage items
            const hasIssues = validationResults.some(message => !message.success);
            const templateSource = configuration.templateLines.join('\n');
            const template = handlebars_1.default.compile(templateSource);
            const data = {
                validationResults,
                hasIssues,
                prNumber,
                author
            };
            const message = template(data);
            if (postComments) {
                try {
                    // Post a comment to the PR with the results
                    yield octokit.rest.issues.createComment(Object.assign(Object.assign({}, context.repo), { issue_number: prNumber, body: message }));
                }
                catch (error) {
                    core.warning(`Error posting comment: ${error}`);
                }
            }
            core.setOutput('result', message);
            core.setOutput('valid', hasIssues ? 'false' : 'true');
            core.info('Validation completed and result output set.');
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function getFileContent(octokit, owner, repo, path, ref) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref,
            });
            if (data && 'content' in data) {
                const content = Buffer.from(data.content, 'base64').toString('utf8');
                return content;
            }
        }
        catch (error) {
            core.error(`Error fetching content from ${path}: ${error}`);
        }
        return null;
    });
}
// Fetch files from the base branch
function getBaseBranchFiles(octokit, owner, repo, baseBranch, folder) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = [];
        try {
            const { data: tree } = yield octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: baseBranch,
                recursive: true,
            });
            for (const item of tree.tree) {
                if (item.type === 'blob' && item.path.startsWith(folder)) {
                    files.push(item.path);
                }
            }
        }
        catch (error) {
            core.error(`Error fetching files from base branch: ${error}`);
        }
        return files;
    });
}
run();
