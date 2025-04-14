import { IValidator } from '../IValidator';
import { IValidationResult } from '../IValidationResult';
import { IValidationRule } from '../IValidationRule';

export class RequireVisitorStatsValidator implements IValidator {
    constructor(
        private rule: IValidationRule,
        private context: {
            octokit: any;
            owner: string;
            repo: string;
            sampleFiles: string[];
            samplesFolder: string;
            sampleName: string;
            prSha: string;
        }
    ) { }

    name = 'requireVisitorStats'; 

    async validate(): Promise<IValidationResult> {
        const { octokit, owner, repo, sampleFiles, samplesFolder, sampleName, prSha } = this.context;

        const readmeFile = sampleFiles.find(f => f === `${samplesFolder}/${sampleName}/README.md`);
        const hasReadme = readmeFile !== undefined;
        let hasImageTracker = false;

        if (hasReadme) {
            try {
                const { data } = await octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: readmeFile,
                    ref: prSha,
                });

                if (data && 'content' in data) {
                    const readmeContent = Buffer.from(data.content, 'base64').toString('utf8');
                    const lines = readmeContent.split('\n');
                    hasImageTracker = lines.some(line =>
                        line.trim().startsWith('<img src="https://m365-visitor-stats.azurewebsites.net/')
                    );
                }
            } catch (error) {
                console.warn(`Error reading README.md: ${error}`);
            }
        }

        return {
            success: hasImageTracker,
            rule: this.rule.rule,
            href: this.rule.href,
            order: this.rule.order,
        };
    }
}