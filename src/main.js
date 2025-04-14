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
            const octokit = github.getOctokit(token);
            const { context } = github;
            const pr = context.payload.pull_request;
            if (!pr) {
                core.setFailed('This action only runs on pull requests.');
                return;
            }
            // Get the PR info
            const { owner, repo } = context.repo;
            const prNumber = pr.number;
            // Get the account name of the author of the PR
            const author = pr.user.login;
            core.info(`PR author: ${author}`);
            // To see if we should skip validation, check if the PR has a label "skip-validation"
            try {
                const { data: labels } = yield octokit.rest.issues.listLabelsOnIssue({
                    owner,
                    repo,
                    issue_number: prNumber,
                });
                const skipValidation = labels.some(label => label.name === 'skip-validation');
                if (skipValidation) {
                    core.info('Skipping validation due to "skip-validatation" tag.');
                    return;
                }
            }
            catch (_a) {
            }
            // Read inputs
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
            const samplesFolder = configuration.contributionsFolder || 'samples';
            const rules = configuration.rules;
            const fileRules = configuration.fileRules || [];
            // Get list of files changed in the PR
            const { data: files } = yield octokit.rest.pulls
                .listFiles({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: prNumber,
            });
            core.info(`\nPR #${prNumber} has ${files.length} files changed.`);
            for (const file of files) {
                core.info(`- ${file.filename}`);
            }
            // Filter to files under "samples/"
            const sampleFiles = files.map(f => f.filename).filter(f => f.startsWith(`${samplesFolder}/`));
            // Determine the sample folders (considering full path structure)
            const sampleFolders = new Set();
            sampleFiles.forEach(include => {
                const relativePath = path.relative(samplesFolder, include);
                const parts = relativePath.split(path.sep);
                if (parts.length > 0) {
                    sampleFolders.add(parts[0]);
                }
            });
            // Build validation messages
            const validationResults = new Array();
            // Verify the sample folder name
            const sampleName = Array.from(sampleFolders)[0];
            core.info(`Sample: ${sampleName}`);
            const samplePath = path.join(samplesFolder, sampleName);
            core.info(`Sample folder: ${samplePath}`);
            // Combine base branch files with PR files
            const baseBranch = pr.base.ref;
            const baseFiles = yield getBaseBranchFiles(octokit, owner, repo, baseBranch, samplesFolder);
            const combinedFiles = new Set([...baseFiles, ...sampleFiles]);
            // Prepare the context object for validators
            const validatorContext = {
                octokit,
                owner,
                repo,
                files: files.map(f => f.filename),
                sampleFiles,
                samplesFolder,
                sampleFolders,
                sampleName,
                prSha: pr.head.sha,
            };
            // Dynamically create and execute validators
            core.info(`\nRules\n========================`);
            for (const [ruleName, ruleConfig] of Object.entries(rules)) {
                const validator = ValidatorFactory_1.ValidatorFactory.createValidator(ruleName, ruleConfig, validatorContext);
                if (!validator) {
                    core.warning(`Unknown validator: ${ruleName}`);
                    continue;
                }
                core.info(`Validating ${ruleName}`);
                const result = yield validator.validate();
                if (!result) {
                    core.warning(`Validator ${ruleName} returned null result`);
                    continue;
                }
                // Log the validation result
                core.info(`Rule: ${result.rule} valid: ${result.success}\n`);
                // Log validation notes
                if (result.notes && result.notes.length > 0) {
                    core.info(`Validation notes for rule: ${result.rule}`);
                    for (const note of result.notes) {
                        core.info(`- File: ${note.file}`);
                        if (note.location) {
                            core.info(`  Location: ${note.location}`);
                        }
                        core.info(`  Severity: ${note.severity}`);
                        core.info(`  Rule: ${note.rule}`);
                        core.info(`  Message: ${note.message}`);
                    }
                }
                validationResults.push(result);
            }
            // Validate files based on rules
            core.info(`\nFile rules\n========================`);
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
            // See if there are any validation notes with severity "Suggestion"
            const hasSuggestions = validationResults.some(message => { var _a; return (_a = message.notes) === null || _a === void 0 ? void 0 : _a.some(note => note.severity === 'Suggestion'); });
            if (hasSuggestions) {
                core.info('There are suggestions in the validation results.');
            }
            const templateSource = configuration.templateLines.join('\n');
            const template = handlebars_1.default.compile(templateSource);
            const data = {
                validationResults,
                hasIssues,
                hasSuggestions,
                prNumber,
                author
            };
            const message = template(data);
            // Should we post a comment to the PR?
            if (postComments) {
                try {
                    // Post a comment to the PR with the results
                    yield octokit.rest.issues.createComment(Object.assign(Object.assign({}, context.repo), { issue_number: prNumber, body: message }));
                }
                catch (error) {
                    core.warning(`Error posting comment: ${error}`);
                }
            }
            // Set outputs for the action
            core.setOutput('result', message);
            core.setOutput('valid', hasIssues ? 'false' : 'true');
            // We done here
            core.info('Validation completed.');
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
