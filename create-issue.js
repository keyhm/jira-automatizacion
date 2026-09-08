const { createIssueInSprint } = require('./src/createIssueInSprint');

const [summary, issueType = 'Task', description = ''] = process.argv.slice(2);

if (!summary) {
  console.error('Uso: npm run create-issue -- "Resumen" ["Task|Bug"] ["Descripción"]');
  process.exit(1);
}

(async () => {
  try {
    const issue = await createIssueInSprint({
      issueType,
      summary,
      description,
    });

    console.log('✅ Issue creado y asignado al sprint');
    console.log(`Issue: ${issue.key}`);
    console.log(`Sprint: ${issue.sprint.name || issue.sprint.id}`);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  }
})();
