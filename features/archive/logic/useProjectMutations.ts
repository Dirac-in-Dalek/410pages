import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UseArchiveMutationsOptions } from '../contract/archiveMutationContract';
import type { Project } from '../../../types';
import {
  addCitationsToProject as addCitationsToProjectRecord,
  addCitationToProject as addCitationToProjectRecord,
  createProject as createProjectRecord,
  createProjectWithCitations as createProjectWithCitationsRecord,
  deleteProject as deleteProjectRecord,
  renameProject as renameProjectRecord,
  reorderProjects as reorderProjectsRecord,
} from '../../../shared/api/projectApi';
import {
  attachCitationToProject,
  deleteProject,
  renameProject,
  reorderProjectsLocally,
} from './archiveLocalPatch';

type Options = Pick<
  UseArchiveMutationsOptions,
  'session' | 'projects' | 'citations' | 'setProjects' | 'invalidateDataLoad'
> & {
  setMutationError: Dispatch<SetStateAction<string | null>>;
};

function restoreProjectOrder(current: Project[], ids: string[]) {
  const byId = new Map(current.map((project) => [project.id, project]));
  const known = new Set(ids);
  return [
    ...ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
    ...current.filter((project) => !known.has(project.id)),
  ];
}

export function useProjectMutations({
  session,
  projects,
  citations,
  setProjects,
  invalidateDataLoad = () => undefined,
  setMutationError,
}: Options) {
  const reordering = useRef(false);
  const creationIds = useRef(new Map<string, string>());
  const ownerRef = useRef(session?.user.id);
  ownerRef.current = session?.user.id;
  const requestId = (key: string) => {
    const existing = creationIds.current.get(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    creationIds.current.set(key, id);
    return id;
  };
  const append = (current: Project[], project: Project) =>
    current.some((p) => p.id === project.id)
      ? current.map((p) => (p.id === project.id ? project : p))
      : [...current, project];
  const handleCreateProject = useCallback(
    async (name: string) => {
      if (!session) {
        return false;
      }

      try {
        const key = JSON.stringify([session.user.id, name.trim(), []]);
        const newProject = await createProjectRecord(session.user.id, name, requestId(key));
        if (ownerRef.current !== session.user.id) return false;
        creationIds.current.delete(key);
        invalidateDataLoad();
        setProjects((current) => append(current, newProject));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error creating project:', error);
        setMutationError('폴더를 만들지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setMutationError, setProjects]
  );

  const handleRenameProject = useCallback(
    async (projectId: string, name: string) => {
      if (!session) {
        return false;
      }

      try {
        await renameProjectRecord(session.user.id, projectId, name);
        invalidateDataLoad();
        setProjects((current) => renameProject(current, projectId, name));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error renaming project:', error);
        setMutationError('폴더 이름을 저장하지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setMutationError, setProjects]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      if (!session) {
        return false;
      }

      try {
        await deleteProjectRecord(session.user.id, projectId);
        invalidateDataLoad();
        setProjects((current) => deleteProject(current, projectId));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error deleting project:', error);
        setMutationError('폴더를 삭제하지 못했습니다. 다시 시도해 주세요.');
        return false;
      }
    },
    [invalidateDataLoad, session, setMutationError, setProjects]
  );

  const handleReorderProjects = useCallback(
    async (dragIndex: number, dropIndex: number) => {
      if (!session) {
        return false;
      }

      if (reordering.current) return false;
      const nextProjects = reorderProjectsLocally(projects, dragIndex, dropIndex);
      if (!nextProjects) {
        return false;
      }

      const userId = session.user.id;
      const originalIds = projects.map((project) => project.id);
      reordering.current = true;
      setProjects(nextProjects);

      try {
        const orderedIds = nextProjects.map((project) => project.id);
        if (orderedIds.length > 0) {
          await reorderProjectsRecord(userId, orderedIds);
        }
        if (ownerRef.current !== userId) return false;
        invalidateDataLoad();
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error reordering projects:', error);
        if (ownerRef.current !== userId) return false;
        setProjects((current) => restoreProjectOrder(current, originalIds));
        setMutationError('폴더 순서를 저장하지 못해 이전 순서로 되돌렸습니다.');
        return false;
      } finally {
        reordering.current = false;
      }
    },
    [invalidateDataLoad, projects, session, setMutationError, setProjects]
  );

  const handleDropCitationToProject = useCallback(
    async (projectId: string, citationId: string) => {
      if (!session) {
        return false;
      }
      if (citations.find((citation) => citation.id === citationId)?.saveStatus) {
        return false;
      }

      try {
        await addCitationToProjectRecord(session.user.id, projectId, citationId);
        invalidateDataLoad();
        setProjects((current) => attachCitationToProject(current, projectId, citationId));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error adding citation to project:', error);
        setMutationError('문장을 폴더에 추가하지 못했습니다. 다시 시도해 주세요.');
        return false;
      }
    },
    [citations, invalidateDataLoad, session, setMutationError, setProjects]
  );

  const handleAddCitationsToProject = useCallback(
    async (projectId: string, citationIds: string[]) => {
      if (!session || citationIds.length === 0) return false;
      try {
        await addCitationsToProjectRecord(session.user.id, projectId, citationIds);
        invalidateDataLoad();
        setProjects((current) =>
          current.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  citationIds: [
                    ...project.citationIds,
                    ...citationIds.filter((id) => !project.citationIds.includes(id)),
                  ],
                }
              : project
          )
        );
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error adding citations to project:', error);
        setMutationError('선택한 항목을 폴더에 추가하지 못했습니다. 선택은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setMutationError, setProjects]
  );

  const handleCreateProjectWithCitations = useCallback(
    async (name: string, citationIds: string[]) => {
      if (!session || !name.trim() || citationIds.length === 0) return false;
      try {
        const key = JSON.stringify([session.user.id, name.trim(), [...citationIds].sort()]);
        const project = await createProjectWithCitationsRecord(
          session.user.id,
          requestId(key),
          name.trim(),
          citationIds
        );
        if (ownerRef.current !== session.user.id) return false;
        creationIds.current.delete(key);
        invalidateDataLoad();
        setProjects((current) => append(current, project));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error creating project with citations:', error);
        setMutationError('새 폴더를 만들지 못했습니다. 이름과 선택은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setMutationError, setProjects]
  );
  return {
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
    handleReorderProjects,
    handleDropCitationToProject,
    handleAddCitationsToProject,
    handleCreateProjectWithCitations,
  };
}
