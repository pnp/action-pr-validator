import { IValidator } from '../IValidator';
import { IValidationResult } from '../IValidationResult';
import { IValidationRule } from '../IValidationRule';
import { IValidationNote } from '../IValidationNote';

export class ReadmeStructureValidator implements IValidator {
    constructor(
        private rule: IValidationRule & { requiredHeaders: { markdown: string; regex?: string }[], maxValidation?: number },
        private context: {
            octokit: any;
            owner: string;
            repo: string;
            sampleFiles: string[];
            samplesFolder: string;
            sampleName: string;
            prSha: string;
        },
        private logger: { info: (message: string) => void; warning: (message: string) => void; error: (message: string) => void } // Logger interface
    ) { }

    name = 'ReadmeStructure'; // Name of the validator

    async validate(): Promise<IValidationResult> {
        const { octokit, owner, repo, sampleFiles, samplesFolder, sampleName, prSha } = this.context;

        const readmeFile = sampleFiles.find(f => f.endsWith('README.md')); 
        const hasReadme = readmeFile !== undefined;
        const notes: IValidationNote[] = [];
        let isValidStructure = false;

        if (hasReadme) {
            try {
                this.logger.info(`Found README.md at path: ${readmeFile}`);
                const { data } = await octokit.rest.repos.getContent({
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
                        .map(line => ({
                            level: line.match(/^#+/)?.[0].length || 0, // Count the number of '#' for the level
                            title: line.replace(/^#+\s*/, '').trim(), // Remove '#' and trim whitespace
                        }))
                        .filter(header => {
                            // If maxValidation is specified, only include headers up to that level
                            return this.rule.maxValidation ? header.level <= this.rule.maxValidation : true;
                        });

                    // Check if headers match the required structure
                    const requiredHeaders = this.rule.requiredHeaders;
                    isValidStructure = this.validateHeaders(headers, requiredHeaders);
                }
            } catch (error) {
                this.logger.warning(`Error reading README.md: ${error}`);
            }
        } else {
            this.logger.warning(`README.md not found in the sample folder: ${samplesFolder}/${sampleName}`);
        }

        // If you need to create validation notes, you can do so here
        // notes.push({
        //     file: readmeFile!,
        //     severity: 'Suggestion',
        //     location: 'Line 1, Column 1',
        //     rule: 'duplicate-alt-text',
        //     message: `This is only a test validation note.`,
        // });

        return {
            success: isValidStructure,
            rule: this.rule.rule,
            href: this.rule.href,
            order: this.rule.order,
            notes
        };
    }

    private validateHeaders(headers: { level: number; title: string }[], requiredHeaders: { markdown: string; regex?: string }[]): boolean {
        let index = 0;

        for (const requiredHeader of requiredHeaders) {
            // Find the required header in the headers list starting from the current index
            index = headers.findIndex((header, i) => {
                if (i < index) return false; // Skip headers before the current index

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