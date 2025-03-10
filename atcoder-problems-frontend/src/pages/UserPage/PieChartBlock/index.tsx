import { Col, Row } from "reactstrap";
import React from "react";
import {
  useContestToProblems,
  useUserSubmission,
} from "../../../api/APIClient";
import Problem from "../../../interfaces/Problem";
import Submission from "../../../interfaces/Submission";
import { ContestId, ProblemId } from "../../../interfaces/Status";
import {
  caseInsensitiveUserId,
  isAccepted,
  isValidResult,
} from "../../../utils";
import { SmallPieChart } from "./SmallPieChart";

enum SubmissionStatus {
  TRYING,
  REJECTED,
  ACCEPTED,
}

const solvedCountForPieChart = (
  contestToProblems: [string, Problem[]][],
  submissions: Map<string, Submission[]>,
  userId: string
): {
  total: number;
  rejected: number;
  solved: number;
}[] => {
  const mapProblemPosition = (problemTitle: string): number => {
    switch (problemTitle.split(".")[0]) {
      case "A": {
        return 0;
      }
      case "B": {
        return 1;
      }
      case "C": {
        return 2;
      }
      case "D": {
        return 3;
      }
      case "E": {
        return 4;
      }
      case "F":
      case "F2": {
        return 5;
      }
      case "G": {
        return 6;
      }
      case "H":
      case "Ex": {
        return 7;
      }
      default: {
        // tslint:disable-next-line
        console.error(`Unsupported problemTitle: ${problemTitle}`);
        return 0;
      }
    }
  };

  const statusCount = contestToProblems
    .map(([, problems]) => {
      const titleStatus = problems.map((problem) => {
        const validSubmissions = submissions
          .get(problem.id)
          ?.filter(
            (s) =>
              caseInsensitiveUserId(s.user_id) === userId &&
              isValidResult(s.result)
          );
        const status = !validSubmissions
          ? SubmissionStatus.TRYING
          : validSubmissions?.find((s) => isAccepted(s.result))
          ? SubmissionStatus.ACCEPTED
          : SubmissionStatus.REJECTED;
        return { title: problem.title, status };
      });
      return { titleStatus };
    })
    .map(({ titleStatus }) =>
      titleStatus.map(({ title, status }) => ({
        position: mapProblemPosition(title),
        status,
      }))
    )
    .flatMap((list) => list)
    .reduce(
      (count, { position, status }) => {
        count[status][position] += 1;
        return count;
      },
      {
        [SubmissionStatus.TRYING]: [0, 0, 0, 0, 0, 0, 0, 0],
        [SubmissionStatus.REJECTED]: [0, 0, 0, 0, 0, 0, 0, 0],
        [SubmissionStatus.ACCEPTED]: [0, 0, 0, 0, 0, 0, 0, 0],
      }
    );
  const totalCount = contestToProblems
    .map(([, problems]) => {
      const problemTitles = problems.map((problem) => problem.title);
      return { problemTitles };
    })
    .map(({ problemTitles }) =>
      problemTitles.map((problemTitle) => mapProblemPosition(problemTitle))
    )
    .flatMap((list) => list)
    .reduce(
      (count, position) => {
        count[position] += 1;
        return count;
      },
      [0, 0, 0, 0, 0, 0, 0, 0]
    );
  return totalCount
    .map((total, index) => ({
      total,
      rejected: statusCount[SubmissionStatus.REJECTED][index],
      solved: statusCount[SubmissionStatus.ACCEPTED][index],
    }))
    .filter((x) => x.total > 0);
};

interface Props {
  userId: string;
}

export const PieChartBlock = (props: Props) => {
  const submissionsMap = (useUserSubmission(props.userId) ?? []).reduce(
    (map, submission) => {
      const submissions = map.get(submission.problem_id) ?? [];
      submissions.push(submission);
      map.set(submission.problem_id, submissions);
      return map;
    },
    new Map<ProblemId, Submission[]>()
  );
  const contestToProblems =
    useContestToProblems() ?? new Map<ContestId, Problem[]>();

  const abcSolved = solvedCountForPieChart(
    Array.from(contestToProblems).filter(([contestId]) =>
      contestId.startsWith("abc")
    ),
    submissionsMap,
    props.userId
  );
  const arcSolved = solvedCountForPieChart(
    Array.from(contestToProblems).filter(([contestId]) =>
      contestId.startsWith("arc")
    ),
    submissionsMap,
    props.userId
  );
  const agcSolved = solvedCountForPieChart(
    Array.from(contestToProblems).filter(([contestId]) =>
      contestId.startsWith("agc")
    ),
    submissionsMap,
    props.userId
  );
  return (
    <>
      <PieCharts problems={abcSolved} title="AtCoder Beginner Contest" />
      <PieCharts problems={arcSolved} title="AtCoder Regular Contest" />
      <PieCharts problems={agcSolved} title="AtCoder Grand Contest" />
    </>
  );
};

interface PieChartsProps {
  problems: { total: number; solved: number; rejected: number }[];
  title: string;
}

const PieCharts: React.FC<PieChartsProps> = ({ problems, title }) => (
  <div>
    <Row className="my-2 border-bottom">
      <h1>{title}</h1>
    </Row>
    <Row className="my-3">
      {problems.map(({ solved, rejected, total }, i) => {
        const key = i <= 6 ? "ABCDEFG".charAt(i) : "H/Ex";
        return (
          <Col
            key={key}
            className="text-center"
            xs="6"
            md={Math.ceil(12 / problems.length)}
          >
            <SmallPieChart
              accepted={solved}
              rejected={rejected}
              trying={total - solved - rejected}
              title={`Problem ${key}`}
            />
          </Col>
        );
      })}
    </Row>
  </div>
);
