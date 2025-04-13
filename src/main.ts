import { IConfiguration } from './IConfiguration';
import { IValidationResult } from './IValidationResult';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import { getInput } from "@actions/core";
import { minimatch } from 'minimatch';
import handlebars from 'handlebars';
import { ValidatorFactory } from './ValidatorFactory';
import { IValidationRule } from './IValidationRule';
import { IFolderNameRule } from './IFolderNameRule';
import { IFileRule } from './IFileRule';

async function run() {
    try {
        const token = getInput("gh-token");
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
            const { data: labels } = await octokit.rest.issues.listLabelsOnIssue({
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
        } catch  {
            
        }
        

        // Read inputs
        core.info('Reading inputs');
        const validationRulesFile = core.getInput('validationRulesFile');
        if (!validationRulesFile) {
            core.setFailed('Validation rules file not set.');
            return;
        } else {
            core.info(`Validation rules file: ${validationRulesFile}`);
        }

        // Post comments?
        const postComments = core.getInput('postComment') === 'true';

        // Read validation rules from JSON file
        const configuration: IConfiguration = JSON.parse(fs.readFileSync(validationRulesFile, 'utf8'));
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
        const fileRules: IFileRule[] = configuration.fileRules || [];


        // const sourceRepo = pr!.head.repo.full_name;
        // const baseRepo = pr!.base.repo.full_name;

        // Get list of files changed in the PR
        const { data: files } = await octokit.rest.pulls
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
        const sampleFolders = new Set<string>();
        sampleFiles.forEach(include => {
            const relativePath = path.relative(samplesFolder, include);
            const parts = relativePath.split(path.sep);
            if (parts.length > 0) {
                sampleFolders.add(parts[0]);
            }
        });
        core.info(`Affected sample folders: ${Array.from(sampleFolders).join(', ')}`);

        // Build validation messages
        const validationResults = new Array<IValidationResult>();
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
        const baseFiles = await getBaseBranchFiles(octokit, owner, repo, baseBranch, samplesFolder);
        const combinedFiles = new Set([...baseFiles, ...sampleFiles]);

        core.info(`Combined files for validation: ${Array.from(combinedFiles).join(', ')}`);

        // Dynamically create and execute validators
        for (const [ruleName, ruleConfig] of Object.entries(rules)) {
            const validator = ValidatorFactory.createValidator(ruleName, ruleConfig, {
                files: files.map(f => f.filename),
                samplesFolder,
                sampleFolders,
                sampleName,
            });

            if (validator) {
                const result = await validator.validate();
                validationResults.push({rule: ruleName, success: result, href: ruleConfig.href, order: ruleConfig.order});
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
                const fileExists = Array.from(combinedFiles).some(f => minimatch(f, fullPath));
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
        const template = handlebars.compile(templateSource);

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
                await octokit.rest.issues.createComment({
                    ...context.repo,
                    issue_number: prNumber,
                    body: message,
                });
            } catch (error) {
                core.warning(`Error posting comment: ${error}`);
            }
        }
        core.setOutput('result', message);
        core.setOutput('valid', hasIssues ? 'false': 'true');

        core.info('Validation completed and result output set.');

    } catch (error: any) {
        core.setFailed(error.message);
    }
}

async function getFileContent(octokit: any, owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref,
        });

        if (data && 'content' in data) {
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            return content;
        }
    } catch (error) {
        core.error(`Error fetching content from ${path}: ${error}`);
    }
    return null;
}

// Fetch files from the base branch
async function getBaseBranchFiles(octokit: any, owner: string, repo: string, baseBranch: string, folder: string): Promise<string[]> {
    const files: string[] = [];
    try {
        const { data: tree } = await octokit.rest.git.getTree({
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
    } catch (error) {
        core.error(`Error fetching files from base branch: ${error}`);
    }
    return files;
}

run();
