import Arborist from '@npmcli/arborist';
import packlist from 'npm-packlist';

export async function scan(destinationDir: string) : Promise<void> {
    const arborist = new Arborist({ path: destinationDir });
    const tree = await arborist.loadActual();
    const files = await packlist(tree);
    for (const file of files) {
        console.log(`--input ${destinationDir}/${file}`);
    }
}