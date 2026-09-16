/** Translate the repeated FAQ controls before the action's Zod parse. */
export function parseFaqRows(formData: FormData) {
  const questions = formData.getAll("faqQuestion").map(String);
  const answers = formData.getAll("faqAnswer").map(String);
  const ids = formData.getAll("faqId").map(String);
  const categories = formData.getAll("faqCategory").map(String);

  return questions
    .map((question, index) => ({
      id: ids[index] || crypto.randomUUID(),
      question: question.trim(),
      answer: (answers[index] ?? "").trim(),
      category: (categories[index] ?? "").trim() || null,
    }))
    .filter((faq) => faq.question && faq.answer);
}
