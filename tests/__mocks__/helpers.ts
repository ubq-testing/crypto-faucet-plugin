import { db } from "./db";
import issueTemplate from "./issue-template";
import { STRINGS } from "./strings";
import usersGet from "./users-get.json";

/**
 * Helper function to setup tests.
 *
 * This function populates the mock database with the external API
 * data you'd expect to find in a real-world scenario.
 *
 * Here is where you create issues, commits, pull requests, etc.
 */
export async function setupTests() {
  for (const item of usersGet) {
    db.users.create(item);
  }

  db.repo.create({
    id: 1,
    name: STRINGS.TEST_REPO,
    owner: {
      login: STRINGS.USER_1,
      id: 1,
    },
    issues: [],
  });

  db.issue.create({
    ...issueTemplate,
  });

  db.issue.create({
    ...issueTemplate,
    id: 2,
    number: 2,
    labels: [],
  });

  createComment("/Hello", 1);
}

export function createComment(comment: string, commentId: number) {
  const isComment = db.issueComments.findFirst({
    where: {
      id: {
        equals: commentId,
      },
    },
  });

  if (isComment) {
    db.issueComments.update({
      where: {
        id: {
          equals: commentId,
        },
      },
      data: {
        body: comment,
      },
    });
  } else {
    db.issueComments.create({
      id: commentId,
      body: comment,
      issue_number: 1,
      user: {
        login: STRINGS.USER_1,
        id: 1,
      },
    });
  }
}
