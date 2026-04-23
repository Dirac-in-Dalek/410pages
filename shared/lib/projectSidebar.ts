import type { ProjectDropIndicator } from '../../features/archive/contract/projectSidebarContract';

export const PROJECT_SORT_MIME = 'project_sort_index';

type ProjectRowBoundary = {
  projectId: string;
  top: number;
  height: number;
};

type ProjectPanelBoundaryInput = {
  projectIds: string[];
  clientY: number;
  centerOffsetY: number;
  top: number;
  height: number;
};

export const getProjectUserInitials = (username: string, fallback = 'RT') => {
  const initials = username.trim().slice(0, 2).toUpperCase();
  return initials || fallback;
};

export const hasProjectSortType = (types: Iterable<string>) => {
  for (const type of types) {
    if (typeof type === 'string' && type.toLowerCase() === PROJECT_SORT_MIME) {
      return true;
    }
  }
  return false;
};

export const resolveProjectDragIndex = (
  getData: (format: string) => string,
  fallbackIndex: number | null
) => {
  const raw = getData(PROJECT_SORT_MIME);
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallbackIndex;
};

export const getProjectedCenterY = (clientY: number, centerOffsetY: number) =>
  clientY + centerOffsetY;

export const getProjectDropPosition = (
  clientY: number,
  centerOffsetY: number,
  targetRect: { top: number; height: number }
) => {
  const projectedCenterY = getProjectedCenterY(clientY, centerOffsetY);
  const midY = targetRect.top + targetRect.height / 2;
  return projectedCenterY < midY ? 'before' : 'after';
};

export const buildProjectListIndicator = (
  rows: ProjectRowBoundary[],
  clientY: number,
  centerOffsetY: number
): ProjectDropIndicator | null => {
  if (rows.length === 0) return null;

  const projectedCenterY = getProjectedCenterY(clientY, centerOffsetY);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowMidY = row.top + row.height / 2;
    if (projectedCenterY < rowMidY) {
      return {
        projectId: row.projectId,
        position: 'before',
        dropIndex: index,
      };
    }
  }

  return {
    projectId: rows[rows.length - 1].projectId,
    position: 'after',
    dropIndex: rows.length,
  };
};

export const buildProjectPanelIndicator = ({
  projectIds,
  clientY,
  centerOffsetY,
  top,
  height,
}: ProjectPanelBoundaryInput): ProjectDropIndicator | null => {
  if (projectIds.length === 0) return null;

  const projectedCenterY = getProjectedCenterY(clientY, centerOffsetY);
  const isStart = projectedCenterY <= top + height / 2;
  return isStart
    ? { projectId: projectIds[0], position: 'before', dropIndex: 0 }
    : {
        projectId: projectIds[projectIds.length - 1],
        position: 'after',
        dropIndex: projectIds.length,
      };
};
