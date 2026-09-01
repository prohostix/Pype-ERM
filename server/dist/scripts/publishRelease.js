import prisma from '../lib/prisma.js';
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 5) {
        console.error('Usage: npx tsx src/scripts/publishRelease.ts <platform> <apkFileName> <versionName> <versionCode> <releaseNotes>');
        process.exit(1);
    }
    const [platform, apkFileName, versionName, versionCodeStr, ...notesArr] = args;
    const versionCode = parseInt(versionCodeStr, 10);
    const releaseNotes = notesArr.join(' ');
    if (isNaN(versionCode)) {
        console.error('Error: versionCode must be a number');
        process.exit(1);
    }
    const manifest = {
        versionName,
        versionCode,
        releaseNotes,
        apkFileName,
        releasedAt: new Date().toISOString(),
    };
    const settingKey = `app_release_${platform}`;
    try {
        const result = await prisma.systemSetting.upsert({
            where: { key: settingKey },
            update: { value: manifest },
            create: {
                key: settingKey,
                value: manifest,
                group: 'app_releases',
            },
        });
        console.log(`✅ Successfully published release for platform "${platform}":`);
        console.log(JSON.stringify(result.value, null, 2));
    }
    catch (error) {
        console.error('❌ Failed to publish release:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=publishRelease.js.map