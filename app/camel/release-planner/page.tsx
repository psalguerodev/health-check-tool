'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  ArrowLeft,
  Plus,
  Minus,
  Download,
  Upload,
  Save,
  Trash2,
  GripVertical,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Edit2,
  Check,
  X,
  Search,
  Filter,
  ChevronUp as ChevronUpIcon,
  MessageSquare,
  User,
  ChevronDown as ChevronDownIcon2,
  Maximize2,
  Minimize2,
  GitBranch,
  Settings,
  Tag,
  RefreshCw,
  ArrowUp,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Breadcrumbs from '../../components/Breadcrumbs';
import HistorySidebar from '../../components/HistorySidebar';
import ChatSidebar from '../../components/ChatSidebar';
import { TestHistoryProvider } from '../../context/TestHistoryContext';

interface Service {
  id: string;
  name: string;
  repo_slug: string;
  workspace: string;
  project_key: string;
  has_blueprint: boolean;
  comment?: string;
  assignedTo?: string;
  dependencies?: string[]; // IDs de servicios de los que depende
}

interface Group {
  id: string;
  name: string;
  services: Service[];
  isExpanded: boolean;
  subGroups?: Group[];
}

interface ReleasePlan {
  groups: Group[];
}

export default function ReleasePlannerPage() {
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [releasePlan, setReleasePlan] = useState<ReleasePlan>({ groups: [] });
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    type: 'group' | 'subgroup';
    parentId?: string;
  } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingService, setEditingService] = useState<{
    id: string;
    field: 'comment' | 'assignedTo' | 'dependencies';
  } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [showDependenciesModal, setShowDependenciesModal] = useState(false);
  const [dependenciesSearchTerm, setDependenciesSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSubGroupId, setSelectedSubGroupId] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<string[]>([]);
  const [filterSubGroups, setFilterSubGroups] = useState<string[]>([]);

  // Estados para Bitbucket
  const [showBitbucketConfigModal, setShowBitbucketConfigModal] =
    useState(false);
  const [showBitbucketCredentialsModal, setShowBitbucketCredentialsModal] =
    useState(false);
  const [bitbucketRepo, setBitbucketRepo] = useState('');
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Estados para toasts
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      type: 'success' | 'error' | 'info';
      message: string;
    }>
  >([]);

  // Funciones para manejar toasts
  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-remover toast después de 4 segundos
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Estados para múltiples Release Plans
  const [currentPlanName, setCurrentPlanName] = useState<string>('default');
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [availablePlans, setAvailablePlans] = useState<string[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Estados para credenciales
  const [bitbucketUsername, setBitbucketUsername] = useState('');
  const [bitbucketAppPassword, setBitbucketAppPassword] = useState('');
  const [bitbucketWorkspace, setBitbucketWorkspace] = useState('');

  // Obtener grupos filtrados
  const getFilteredGroups = (): Group[] => {
    if (filterGroups.length === 0 && filterSubGroups.length === 0) {
      return releasePlan.groups;
    }

    return releasePlan.groups
      .map((group) => {
        // Si hay filtro de grupos, verificar si el grupo está seleccionado
        if (filterGroups.length > 0 && !filterGroups.includes(group.name)) {
          return null; // No mostrar este grupo
        }

        // Si hay filtro de subgrupos, filtrar los subgrupos
        if (filterSubGroups.length > 0 && group.subGroups) {
          const filteredSubGroups = group.subGroups.filter((subGroup) =>
            filterSubGroups.includes(subGroup.name)
          );

          // Si no hay subgrupos que coincidan, no mostrar el grupo
          if (filteredSubGroups.length === 0) {
            return null;
          }

          // Retornar el grupo con subgrupos filtrados
          return {
            ...group,
            subGroups: filteredSubGroups,
          };
        }

        return group;
      })
      .filter((group): group is Group => group !== null); // Type guard para remover null
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilterGroups([]);
    setFilterSubGroups([]);
  };

  // Manejar selección múltiple de grupos
  const handleGroupFilterChange = (groupName: string) => {
    setFilterGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((name) => name !== groupName)
        : [...prev, groupName]
    );
  };

  // Manejar selección múltiple de subgrupos
  const handleSubGroupFilterChange = (subGroupName: string) => {
    setFilterSubGroups((prev) =>
      prev.includes(subGroupName)
        ? prev.filter((name) => name !== subGroupName)
        : [...prev, subGroupName]
    );
  };

  // Obtener todos los servicios disponibles para dependencias (todos los 277 servicios)
  const getAllServices = (): Service[] => {
    return availableServices;
  };

  // Obtener servicios del release plan actual
  const getReleasePlanServices = (): Service[] => {
    const allServices: Service[] = [];
    releasePlan.groups.forEach((group) => {
      allServices.push(...group.services);
      group.subGroups?.forEach((subGroup) => {
        allServices.push(...subGroup.services);
      });
    });
    return allServices;
  };

  // Obtener servicios filtrados para el modal de dependencias
  const getFilteredServicesForDependencies = (): Service[] => {
    const allServices = getAllServices();
    let filteredServices = allServices;

    // Aplicar filtro de búsqueda si existe
    if (dependenciesSearchTerm.trim()) {
      const searchLower = dependenciesSearchTerm.toLowerCase();
      filteredServices = allServices.filter(
        (service) =>
          service.name.toLowerCase().includes(searchLower) ||
          service.workspace.toLowerCase().includes(searchLower) ||
          service.project_key.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar: servicios seleccionados primero, luego el resto
    if (editingService) {
      const selectedDependencies =
        getReleasePlanServices().find((s) => s.id === editingService.id)
          ?.dependencies || [];

      return filteredServices.sort((a, b) => {
        const aIsSelected =
          selectedDependencies.includes(a.id) ||
          selectedDependencies.includes(a.name);
        const bIsSelected =
          selectedDependencies.includes(b.id) ||
          selectedDependencies.includes(b.name);

        // Si uno está seleccionado y el otro no, el seleccionado va primero
        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;

        // Si ambos tienen el mismo estado, ordenar alfabéticamente por nombre
        return a.name.localeCompare(b.name);
      });
    }

    return filteredServices;
  };

  // Manejar dependencias de servicios
  const handleDependencyToggle = (
    serviceId: string,
    dependencyIdOrName: string
  ) => {
    setReleasePlan((prev) => ({
      ...prev,
      groups: prev.groups.map((group) => ({
        ...group,
        services: group.services.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                dependencies: (service.dependencies || []).includes(
                  dependencyIdOrName
                )
                  ? (service.dependencies || []).filter(
                      (dep) => dep !== dependencyIdOrName
                    )
                  : [...(service.dependencies || []), dependencyIdOrName],
              }
            : service
        ),
        subGroups: group.subGroups?.map((subGroup) => ({
          ...subGroup,
          services: subGroup.services.map((service) =>
            service.id === serviceId
              ? {
                  ...service,
                  dependencies: (service.dependencies || []).includes(
                    dependencyIdOrName
                  )
                    ? (service.dependencies || []).filter(
                        (dep) => dep !== dependencyIdOrName
                      )
                    : [...(service.dependencies || []), dependencyIdOrName],
                }
              : service
          ),
        })),
      })),
    }));
  };

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSearchModal) {
          setShowSearchModal(false);
          setSearchTerm('');
          setSelectedGroupId('');
          setSelectedSubGroupId('');
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showSearchModal, isFullscreen]);

  // Cargar planes disponibles desde Bitbucket o localStorage
  const getAvailablePlans = async (): Promise<string[]> => {
    // Si Bitbucket está configurado, SIEMPRE consultar Bitbucket para obtener la lista de planes
    if (bitbucketRepo) {
      try {
        const credentials = localStorage.getItem('bitbucket-credentials');
        if (credentials) {
          const { username, appPassword, workspace } = JSON.parse(credentials);

          const response = await fetch('/api/bitbucket-files', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username,
              appPassword,
              workspace,
              repoSlug: bitbucketRepo,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const plans = data.files?.map((file: any) => file.planName) || [];
            console.log('Lista de planes obtenida desde Bitbucket:', plans);
            return plans; // Siempre devolver planes de Bitbucket si está configurado
          } else {
            console.error('Error en respuesta de Bitbucket:', response.status);
            addToast('error', 'Error al obtener planes desde Bitbucket');
          }
        } else {
          console.log('No hay credenciales de Bitbucket guardadas');
        }
      } catch (error) {
        console.error('Error al cargar planes desde Bitbucket:', error);
        addToast('error', 'Error al cargar planes desde Bitbucket');
      }
    }

    // Fallback: cargar desde localStorage solo si Bitbucket NO está configurado
    console.log('Bitbucket no configurado, usando localStorage como fallback');
    const plans = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith('release-plan-') &&
        key !== 'release-plan-bitbucket-repo' &&
        key !== 'release-plan-selected'
      ) {
        const planName = key.replace('release-plan-', '');
        plans.push(planName);
      }
    }
    console.log('Planes cargados desde localStorage (fallback):', plans);
    return plans;
  };

  // Cargar planes disponibles
  const loadAvailablePlans = async () => {
    setIsLoadingPlans(true);
    try {
      const plans = await getAvailablePlans();
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Error al cargar planes:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Cargar Release Plan específico
  const loadReleasePlan = async (planName: string) => {
    console.log('loadReleasePlan llamado con:', planName);
    const key =
      planName === 'default' ? 'release-plan' : `release-plan-${planName}`;
    console.log('Buscando en localStorage con key:', key);
    const savedPlan = localStorage.getItem(key);
    console.log('Plan encontrado en localStorage:', !!savedPlan);

    if (savedPlan) {
      try {
        const parsedPlan = JSON.parse(savedPlan);
        console.log(
          'Plan parseado exitosamente, grupos:',
          parsedPlan.groups?.length || 0
        );
        setReleasePlan(parsedPlan);
        setCurrentPlanName(planName);
        console.log('Plan cargado y seleccionado:', planName);
      } catch (error) {
        console.error('Error al cargar Release Plan:', error);
      }
    } else {
      console.log('Plan no encontrado en localStorage');

      // Si Bitbucket está configurado, intentar cargar desde Bitbucket
      if (bitbucketRepo) {
        console.log('Intentando cargar desde Bitbucket...');
        try {
          await pullFromBitbucket(planName);
          return; // pullFromBitbucket ya actualiza el estado
        } catch (error) {
          console.error('Error al cargar desde Bitbucket:', error);
        }
      }

      console.log('Creando plan vacío');
      // Si no existe en Bitbucket tampoco, crear uno vacío
      setReleasePlan({ groups: [] });
      setCurrentPlanName(planName);
      console.log('Plan vacío creado y seleccionado:', planName);
    }
  };

  // Crear nuevo plan
  const createNewPlan = async () => {
    if (!newPlanName.trim()) {
      addToast('error', 'Por favor ingresa un nombre para el plan');
      return;
    }

    const sanitizedName = newPlanName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
    const key = `release-plan-${sanitizedName}`;

    if (localStorage.getItem(key)) {
      addToast('error', 'Ya existe un plan con ese nombre');
      return;
    }

    // Crear plan vacío
    localStorage.setItem(key, JSON.stringify({ groups: [] }));
    setNewPlanName('');
    setShowCreatePlanModal(false);
    loadReleasePlan(sanitizedName);

    // Recargar planes disponibles
    await loadAvailablePlans();
  };

  // Cargar Release Plan desde localStorage
  useEffect(() => {
    // Limpiar localStorage corrupto - remover plan "selected" si existe
    localStorage.removeItem('release-plan-selected');

    // Intentar cargar el plan seleccionado previamente
    const selectedPlan = localStorage.getItem('release-plan-selected');
    console.log('Plan seleccionado en localStorage:', selectedPlan);

    if (selectedPlan && selectedPlan !== 'selected') {
      console.log('Cargando plan seleccionado:', selectedPlan);
      loadReleasePlan(selectedPlan);
    } else {
      console.log('No hay plan seleccionado válido, cargando default');
      // Si no hay plan seleccionado, cargar el default
      loadReleasePlan('default');
    }
  }, []);

  // Guardar Release Plan en localStorage cuando cambie
  useEffect(() => {
    if (releasePlan.groups.length > 0) {
      const key =
        currentPlanName === 'default'
          ? 'release-plan'
          : `release-plan-${currentPlanName}`;
      localStorage.setItem(key, JSON.stringify(releasePlan));
    }
  }, [releasePlan, currentPlanName]);

  // Guardar plan seleccionado cuando cambie
  useEffect(() => {
    if (currentPlanName) {
      console.log('Guardando plan seleccionado:', currentPlanName);
      localStorage.setItem('release-plan-selected', currentPlanName);
    }
  }, [currentPlanName]);

  // Cargar configuración de Bitbucket
  useEffect(() => {
    const savedRepo = localStorage.getItem('release-plan-bitbucket-repo');
    if (savedRepo) {
      setBitbucketRepo(savedRepo);
    }

    // Cargar credenciales
    const credentials = localStorage.getItem('bitbucket-credentials');
    if (credentials) {
      try {
        const { username, appPassword, workspace } = JSON.parse(credentials);
        setBitbucketUsername(username || '');
        setBitbucketAppPassword(appPassword || '');
        setBitbucketWorkspace(workspace || '');
      } catch (error) {
        console.error('Error al cargar credenciales:', error);
      }
    }
  }, []);

  // Cargar planes disponibles cuando se configure Bitbucket
  useEffect(() => {
    if (bitbucketRepo && bitbucketUsername && bitbucketWorkspace) {
      console.log('Bitbucket configurado, cargando planes disponibles...');
      loadAvailablePlans();
    }
  }, [bitbucketRepo, bitbucketUsername, bitbucketWorkspace]);

  // Cargar planes disponibles al inicializar si Bitbucket ya está configurado
  useEffect(() => {
    const savedRepo = localStorage.getItem('release-plan-bitbucket-repo');
    const savedCredentials = localStorage.getItem('bitbucket-credentials');

    if (savedRepo && savedCredentials) {
      console.log(
        'Bitbucket ya configurado al inicializar, cargando planes...'
      );
      // Esperar un poco para que se carguen las credenciales
      setTimeout(() => {
        loadAvailablePlans();
      }, 100);
    }
  }, []);

  // Cargar servicios disponibles
  useEffect(() => {
    const loadServices = async () => {
      try {
        setIsLoading(true);

        // Cargar lista de repositorios filtrados
        const listaResponse = await fetch('/data/lista-repositorios.csv');
        const listaText = await listaResponse.text();
        const listaRepos = listaText
          .trim()
          .split('\n')
          .map((line) => line.trim());

        // Cargar datos completos de Bitbucket
        const bitbucketResponse = await fetch(
          '/data/bitbucket-repositorios.csv'
        );
        const bitbucketText = await bitbucketResponse.text();
        const bitbucketLines = bitbucketText.trim().split('\n');
        const bitbucketHeaders = bitbucketLines[0]
          .split(',')
          .map((h) => h.replace(/"/g, ''));

        // Crear mapa de repositorios de Bitbucket por repo_slug
        const bitbucketMap = new Map();
        bitbucketLines.slice(1).forEach((line) => {
          const values = line.split(',').map((v) => v.replace(/"/g, ''));
          const repoData = {
            workspace: values[0],
            project_key: values[1],
            repo_slug: values[2],
            repo_name: values[3],
            is_private: values[4] === 'true',
            main_branch: values[5],
            language: values[6],
            created_on: values[7],
            updated_on: values[8],
            size_bytes: parseInt(values[9]) || 0,
            html_url: values[10],
            https_url: values[11],
            ssh_url: values[12],
          };
          bitbucketMap.set(values[2], repoData);
        });

        // Cargar lista de repositorios con blueprints disponibles
        const blueprintsResponse = await fetch(
          '/data/blueprints/lista-repositorios-blueprints.csv'
        );
        const blueprintsText = await blueprintsResponse.text();
        const blueprintsList = blueprintsText
          .trim()
          .split('\n')
          .slice(1)
          .map((line) => line.split(',')[0].trim())
          .filter((line) => line.length > 0);

        // Crear servicios
        const services: Service[] = listaRepos.map((repoSlug) => {
          const bitbucketData = bitbucketMap.get(repoSlug);
          const hasBlueprint = blueprintsList.includes(repoSlug);

          if (bitbucketData) {
            return {
              id: repoSlug,
              name: bitbucketData.repo_name,
              repo_slug: repoSlug,
              workspace: bitbucketData.workspace,
              project_key: bitbucketData.project_key,
              has_blueprint: hasBlueprint,
            };
          } else {
            return {
              id: repoSlug,
              name: repoSlug,
              repo_slug: repoSlug,
              workspace: 'N/A',
              project_key: 'N/A',
              has_blueprint: hasBlueprint,
            };
          }
        });

        setAvailableServices(services);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();
  }, []);

  const handleBack = () => {
    router.push('/camel');
  };

  const createNewGroup = () => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: `Grupo ${releasePlan.groups.length + 1}`,
      services: [],
      isExpanded: true,
      subGroups: [],
    };

    setReleasePlan((prev) => ({
      groups: [...prev.groups, newGroup],
    }));
  };

  const createSubGroup = (parentGroupId: string) => {
    const parentGroup = findGroupById(releasePlan.groups, parentGroupId);
    if (parentGroup) {
      const newSubGroup: Group = {
        id: `subgroup-${Date.now()}`,
        name: `Subgrupo ${(parentGroup.subGroups?.length || 0) + 1}`,
        services: [],
        isExpanded: true,
      };

      setReleasePlan((prev) => ({
        groups: prev.groups.map((group) =>
          group.id === parentGroupId
            ? { ...group, subGroups: [...(group.subGroups || []), newSubGroup] }
            : group
        ),
      }));
    }
  };

  const findGroupById = (groups: Group[], id: string): Group | null => {
    for (const group of groups) {
      if (group.id === id) return group;
      if (group.subGroups) {
        const found = findGroupById(group.subGroups, id);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleGroupExpansion = (groupId: string) => {
    setReleasePlan((prev) => ({
      groups: prev.groups.map((group) =>
        group.id === groupId
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      ),
    }));
  };

  const toggleSubGroupExpansion = (groupId: string, subGroupId: string) => {
    setReleasePlan((prev) => ({
      groups: prev.groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            subGroups: group.subGroups?.map((subGroup) =>
              subGroup.id === subGroupId
                ? { ...subGroup, isExpanded: !subGroup.isExpanded }
                : subGroup
            ),
          };
        }
        return group;
      }),
    }));
  };

  const getTotalServicesInGroup = (group: Group): number => {
    const groupServices = group.services.length;
    const subGroupServices =
      group.subGroups?.reduce(
        (total, subGroup) => total + subGroup.services.length,
        0
      ) || 0;
    return groupServices + subGroupServices;
  };

  const clearReleasePlan = () => {
    if (
      confirm(
        '¿Estás seguro de que quieres limpiar todo el Release Plan? Esta acción no se puede deshacer.'
      )
    ) {
      setReleasePlan({ groups: [] });
      localStorage.removeItem('release-plan');
    }
  };

  const deleteGroup = (groupId: string) => {
    const group = findGroupById(releasePlan.groups, groupId);

    if (group) {
      const totalServices =
        group.services.length +
        (group.subGroups?.reduce((acc, sg) => acc + sg.services.length, 0) ||
          0);
      const confirmMessage =
        totalServices > 0
          ? `¿Estás seguro de que quieres eliminar el grupo "${group.name}" y todos sus ${totalServices} servicios?`
          : `¿Estás seguro de que quieres eliminar el grupo "${group.name}"?`;

      if (confirm(confirmMessage)) {
        setReleasePlan((prev) => ({
          groups: prev.groups.filter((group) => group.id !== groupId),
        }));
      }
    }
  };

  const deleteSubGroup = (groupId: string, subGroupId: string) => {
    const group = findGroupById(releasePlan.groups, groupId);
    const subGroup = group?.subGroups?.find((sg) => sg.id === subGroupId);

    if (subGroup) {
      const confirmMessage =
        subGroup.services.length > 0
          ? `¿Estás seguro de que quieres eliminar el subgrupo "${subGroup.name}" y sus ${subGroup.services.length} servicios?`
          : `¿Estás seguro de que quieres eliminar el subgrupo "${subGroup.name}"?`;

      if (confirm(confirmMessage)) {
        setReleasePlan((prev) => ({
          groups: prev.groups.map((group) => {
            if (group.id === groupId) {
              return {
                ...group,
                subGroups: group.subGroups?.filter(
                  (subGroup) => subGroup.id !== subGroupId
                ),
              };
            }
            return group;
          }),
        }));
      }
    }
  };

  const moveGroup = (groupId: string, direction: 'up' | 'down') => {
    setReleasePlan((prev) => {
      const currentIndex = prev.groups.findIndex((g) => g.id === groupId);
      if (currentIndex === -1) return prev;

      const newGroups = [...prev.groups];
      const targetIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex >= 0 && targetIndex < newGroups.length) {
        [newGroups[currentIndex], newGroups[targetIndex]] = [
          newGroups[targetIndex],
          newGroups[currentIndex],
        ];
      }

      return { ...prev, groups: newGroups };
    });
  };

  const moveSubGroup = (
    groupId: string,
    subGroupId: string,
    direction: 'up' | 'down'
  ) => {
    setReleasePlan((prev) => {
      const group = prev.groups.find((g) => g.id === groupId);
      if (!group || !group.subGroups) return prev;

      const currentIndex = group.subGroups.findIndex(
        (sg) => sg.id === subGroupId
      );
      if (currentIndex === -1) return prev;

      const newSubGroups = [...group.subGroups];
      const targetIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex >= 0 && targetIndex < newSubGroups.length) {
        [newSubGroups[currentIndex], newSubGroups[targetIndex]] = [
          newSubGroups[targetIndex],
          newSubGroups[currentIndex],
        ];
      }

      return {
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId ? { ...g, subGroups: newSubGroups } : g
        ),
      };
    });
  };

  const moveServiceToSubGroup = (
    groupId: string,
    serviceId: string,
    targetSubGroupId: string | null
  ) => {
    setReleasePlan((prev) => {
      const group = prev.groups.find((g) => g.id === groupId);
      if (!group) return prev;

      // Encontrar el servicio en el grupo o subgrupo actual
      let service: Service | null = null;
      let sourceSubGroupId: string | null = null;

      // Buscar en servicios del grupo principal
      const serviceIndex = group.services.findIndex((s) => s.id === serviceId);
      if (serviceIndex !== -1) {
        service = group.services[serviceIndex];
        sourceSubGroupId = null;
      } else {
        // Buscar en subgrupos
        for (const subGroup of group.subGroups || []) {
          const subServiceIndex = subGroup.services.findIndex(
            (s) => s.id === serviceId
          );
          if (subServiceIndex !== -1) {
            service = subGroup.services[subServiceIndex];
            sourceSubGroupId = subGroup.id;
            break;
          }
        }
      }

      if (!service) return prev;

      // Si ya está en el subgrupo destino, no hacer nada
      if (sourceSubGroupId === targetSubGroupId) return prev;

      // Remover el servicio de su ubicación actual
      const newGroups = prev.groups.map((g) => {
        if (g.id === groupId) {
          if (sourceSubGroupId === null) {
            // Remover de servicios del grupo principal
            return {
              ...g,
              services: g.services.filter((s) => s.id !== serviceId),
            };
          } else {
            // Remover de subgrupo
            return {
              ...g,
              subGroups: g.subGroups?.map((sg) =>
                sg.id === sourceSubGroupId
                  ? {
                      ...sg,
                      services: sg.services.filter((s) => s.id !== serviceId),
                    }
                  : sg
              ),
            };
          }
        }
        return g;
      });

      // Agregar el servicio al destino
      const finalGroups = newGroups.map((g) => {
        if (g.id === groupId) {
          if (targetSubGroupId === null) {
            // Agregar a servicios del grupo principal
            return {
              ...g,
              services: [...g.services, service!],
            };
          } else {
            // Agregar a subgrupo
            return {
              ...g,
              subGroups: g.subGroups?.map((sg) =>
                sg.id === targetSubGroupId
                  ? { ...sg, services: [...sg.services, service!] }
                  : sg
              ),
            };
          }
        }
        return g;
      });

      return { ...prev, groups: finalGroups };
    });
  };

  const moveServiceWithinGroup = (
    groupId: string,
    serviceId: string,
    direction: 'up' | 'down',
    subGroupId?: string
  ) => {
    setReleasePlan((prev) => ({
      groups: prev.groups.map((group) => {
        if (group.id === groupId) {
          if (subGroupId) {
            // Mover dentro de subgrupo
            const subGroup = group.subGroups?.find(
              (sg) => sg.id === subGroupId
            );
            if (subGroup) {
              const serviceIndex = subGroup.services.findIndex(
                (s) => s.id === serviceId
              );
              if (serviceIndex !== -1) {
                const newServices = [...subGroup.services];
                const targetIndex =
                  direction === 'up' ? serviceIndex - 1 : serviceIndex + 1;

                if (targetIndex >= 0 && targetIndex < newServices.length) {
                  [newServices[serviceIndex], newServices[targetIndex]] = [
                    newServices[targetIndex],
                    newServices[serviceIndex],
                  ];

                  return {
                    ...group,
                    subGroups: group.subGroups?.map((sg) =>
                      sg.id === subGroupId
                        ? { ...sg, services: newServices }
                        : sg
                    ),
                  };
                }
              }
            }
          } else {
            // Mover dentro de grupo principal
            const serviceIndex = group.services.findIndex(
              (s) => s.id === serviceId
            );
            if (serviceIndex !== -1) {
              const newServices = [...group.services];
              const targetIndex =
                direction === 'up' ? serviceIndex - 1 : serviceIndex + 1;

              if (targetIndex >= 0 && targetIndex < newServices.length) {
                [newServices[serviceIndex], newServices[targetIndex]] = [
                  newServices[targetIndex],
                  newServices[serviceIndex],
                ];

                return { ...group, services: newServices };
              }
            }
          }
        }
        return group;
      }),
    }));
  };

  const removeServiceFromGroup = (groupId: string, serviceId: string) => {
    setReleasePlan((prev) => ({
      groups: prev.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              services: group.services.filter((s) => s.id !== serviceId),
            }
          : group
      ),
    }));
  };

  const startEditingGroup = (
    groupId: string,
    type: 'group' | 'subgroup',
    parentId?: string
  ) => {
    const group =
      type === 'group'
        ? findGroupById(releasePlan.groups, groupId)
        : findGroupById(releasePlan.groups, parentId!)?.subGroups?.find(
            (sg) => sg.id === groupId
          );

    if (group) {
      setEditingGroup({ id: groupId, type, parentId });
      setEditingName(group.name);
    }
  };

  const saveGroupName = () => {
    if (!editingGroup || !editingName.trim()) return;

    setReleasePlan((prev) => ({
      groups: prev.groups.map((group) => {
        if (editingGroup.type === 'group' && group.id === editingGroup.id) {
          return { ...group, name: editingName.trim() };
        } else if (
          editingGroup.type === 'subgroup' &&
          group.id === editingGroup.parentId
        ) {
          return {
            ...group,
            subGroups: group.subGroups?.map((subGroup) =>
              subGroup.id === editingGroup.id
                ? { ...subGroup, name: editingName.trim() }
                : subGroup
            ),
          };
        }
        return group;
      }),
    }));

    setEditingGroup(null);
    setEditingName('');
  };

  const cancelEditingGroup = () => {
    setEditingGroup(null);
    setEditingName('');
  };

  const startEditingService = (
    serviceId: string,
    field: 'comment' | 'assignedTo',
    currentValue: string = ''
  ) => {
    setEditingService({ id: serviceId, field });
    setEditingValue(currentValue);
  };

  const startEditingDependencies = (serviceId: string) => {
    setEditingService({ id: serviceId, field: 'dependencies' });
    setDependenciesSearchTerm('');
    setShowDependenciesModal(true);
  };

  const handleServiceDetailClick = (service: Service) => {
    if (service.has_blueprint) {
      router.push(`/camel/${service.repo_slug}`);
    }
  };

  const saveServiceField = () => {
    if (!editingService) return;

    setReleasePlan((prev) => ({
      groups: prev.groups.map((group) => ({
        ...group,
        services: group.services.map((service) =>
          service.id === editingService.id
            ? { ...service, [editingService.field]: editingValue }
            : service
        ),
        subGroups: group.subGroups?.map((subGroup) => ({
          ...subGroup,
          services: subGroup.services.map((service) =>
            service.id === editingService.id
              ? { ...service, [editingService.field]: editingValue }
              : service
          ),
        })),
      })),
    }));

    setEditingService(null);
    setEditingValue('');
  };

  const cancelEditingService = () => {
    setEditingService(null);
    setEditingValue('');
  };

  // Filtrar servicios disponibles
  const filteredAvailableServices = availableServices.filter((service) => {
    const isNotInUse = !releasePlan.groups.some(
      (group) =>
        group.services.some((s) => s.id === service.id) ||
        (group.subGroups &&
          group.subGroups.some((subGroup) =>
            subGroup.services.some((s) => s.id === service.id)
          ))
    );

    const matchesSearch = searchTerm
      ? service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.repo_slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.workspace.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.project_key.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    return isNotInUse && matchesSearch;
  });

  // Agregar servicio directamente a un grupo
  const addServiceToGroup = (
    serviceId: string,
    groupId: string,
    subGroupId?: string
  ) => {
    const service = availableServices.find((s) => s.id === serviceId);
    if (!service) return;

    setReleasePlan((prev) => ({
      groups: prev.groups.map((group) => {
        if (group.id === groupId) {
          if (subGroupId) {
            // Agregar a subgrupo
            return {
              ...group,
              subGroups: group.subGroups?.map((subGroup) =>
                subGroup.id === subGroupId
                  ? { ...subGroup, services: [...subGroup.services, service] }
                  : subGroup
              ),
            };
          } else {
            // Agregar a grupo principal
            return { ...group, services: [...group.services, service] };
          }
        }
        return group;
      }),
    }));
  };

  // Agregar servicio al grupo seleccionado
  const addServiceToSelectedGroup = (serviceId: string) => {
    if (selectedGroupId) {
      addServiceToGroup(
        serviceId,
        selectedGroupId,
        selectedSubGroupId || undefined
      );
    }
  };

  const importReleasePlan = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        const lines = csvContent.split('\n');

        // Saltar la primera línea (headers)
        const dataLines = lines.slice(1).filter((line) => line.trim());

        if (dataLines.length === 0) {
          addToast(
            'error',
            'El archivo está vacío o no contiene datos válidos.'
          );
          return;
        }

        // Parsear CSV
        const importedGroups: Group[] = [];
        const groupMap = new Map<string, Group>();
        const subGroupMap = new Map<
          string,
          { group: Group; subGroup: Group }
        >();
        const serviceNameToIdMap = new Map<string, string>(); // Mapear nombres a IDs

        dataLines.forEach((line, index) => {
          // Parsear línea CSV (manejar comillas)
          const values = parseCSVLine(line);
          if (values.length < 6) return; // Línea inválida

          const [
            grupo,
            subgrupo,
            servicio,
            workspace,
            proyecto,
            blueprint,
            orden,
            tipo,
            asignado,
            comentarios,
            dependencias,
          ] = values;

          if (!grupo || !servicio) return; // Datos requeridos faltantes

          // Crear o encontrar grupo
          let group = groupMap.get(grupo);
          if (!group) {
            group = {
              id: `group-${Date.now()}-${Math.random()}`,
              name: grupo,
              services: [],
              isExpanded: true,
              subGroups: [],
            };
            groupMap.set(grupo, group);
            importedGroups.push(group);
          }

          // Crear servicio usando el nombre del repositorio como ID
          const serviceId = servicio; // Usar el nombre del repositorio como ID
          const service = {
            id: serviceId,
            name: servicio,
            workspace: workspace || '',
            project_key: proyecto || '',
            repo_slug: servicio.toLowerCase().replace(/\s+/g, '-'), // Generar repo_slug basado en el nombre
            has_blueprint:
              blueprint?.toLowerCase() === 'sí' ||
              blueprint?.toLowerCase() === 'si',
            assignedTo: asignado || '',
            comment: comentarios || '',
            dependencies: [], // Se resolverán después
          };

          // Mapear nombre del servicio a su ID para resolver dependencias
          serviceNameToIdMap.set(servicio, serviceId);

          if (subgrupo && subgrupo.trim()) {
            // Agregar a subgrupo
            let subGroupData = subGroupMap.get(`${grupo}-${subgrupo}`);
            if (!subGroupData) {
              const subGroup: Group = {
                id: `subgroup-${Date.now()}-${Math.random()}`,
                name: subgrupo,
                services: [],
                isExpanded: true,
              };
              group.subGroups = group.subGroups || [];
              group.subGroups.push(subGroup);
              subGroupData = { group, subGroup };
              subGroupMap.set(`${grupo}-${subgrupo}`, subGroupData);
            }
            subGroupData.subGroup.services.push(service);
          } else {
            // Agregar al grupo principal
            group.services.push(service);
          }
        });

        // Resolver dependencias después de crear todos los servicios
        dataLines.forEach((line, index) => {
          const values = parseCSVLine(line);
          if (values.length < 12) {
            return; // Línea inválida o sin dependencias
          }

          const [
            grupo,
            subgrupo,
            servicio,
            workspace,
            proyecto,
            blueprint,
            orden,
            tipo,
            asignado,
            comentarios,
            dependencias,
            fechaExportacion,
          ] = values;

          if (!grupo || !servicio) return;

          // Resolver dependencias solo si existen
          let resolvedDependencies: string[] = [];
          if (dependencias && dependencias.trim()) {
            // Simplemente dividir las dependencias y usarlas tal cual
            resolvedDependencies = dependencias
              .split(';')
              .map((dep) => dep.trim())
              .filter((dep) => dep);
          }

          // Actualizar el servicio con las dependencias resueltas
          importedGroups.forEach((group) => {
            // Buscar en servicios del grupo principal
            group.services.forEach((service) => {
              if (service.id === servicio) {
                service.dependencies = resolvedDependencies;
              }
            });

            // Buscar en servicios de subgrupos
            group.subGroups?.forEach((subGroup) => {
              subGroup.services.forEach((service) => {
                if (service.id === servicio) {
                  service.dependencies = resolvedDependencies;
                }
              });
            });
          });
        });

        if (importedGroups.length > 0) {
          setReleasePlan({ groups: importedGroups });
          setShowImportModal(false);
          addToast(
            'success',
            `Release plan importado exitosamente: ${importedGroups.length} grupos, ${dataLines.length} servicios.`
          );
        } else {
          addToast(
            'error',
            'No se pudieron importar datos válidos del archivo.'
          );
        }
      } catch (error) {
        console.error('Error al importar:', error);
        addToast(
          'error',
          'Error al procesar el archivo. Verifica que sea un CSV válido.'
        );
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  // Guardar credenciales de Bitbucket
  const saveBitbucketCredentials = () => {
    if (
      !bitbucketUsername.trim() ||
      !bitbucketAppPassword.trim() ||
      !bitbucketWorkspace.trim()
    ) {
      addToast('error', 'Por favor completa todos los campos de credenciales');
      return;
    }

    const credentials = {
      username: bitbucketUsername,
      appPassword: bitbucketAppPassword,
      workspace: bitbucketWorkspace,
    };

    localStorage.setItem('bitbucket-credentials', JSON.stringify(credentials));
    setShowBitbucketCredentialsModal(false);
    addToast('success', 'Credenciales guardadas correctamente');
  };

  // Guardar configuración de repositorio Bitbucket
  const saveBitbucketConfig = () => {
    if (!bitbucketRepo.trim()) {
      addToast('error', 'Por favor ingresa el nombre del repositorio');
      return;
    }
    localStorage.setItem('release-plan-bitbucket-repo', bitbucketRepo);
    setShowBitbucketConfigModal(false);
    addToast('success', 'Configuración de Bitbucket guardada correctamente');
  };

  // Abrir modal de commit
  const openCommitModal = () => {
    if (!bitbucketRepo) {
      addToast('error', 'Primero debes configurar el repositorio de Bitbucket');
      setShowBitbucketConfigModal(true);
      return;
    }
    setCommitMessage('');
    setShowCommitModal(true);
  };

  // Función auxiliar para parsear CSV a Release Plan
  const parseCSVToReleasePlan = async (lines: string[], planName: string) => {
    const groups: Group[] = [];
    const groupMap = new Map<string, Group>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      if (values.length < 12) continue;

      const [
        grupo,
        subgrupo,
        servicio,
        workspace,
        proyecto,
        blueprint,
        orden,
        tipo,
        asignado,
        comentarios,
        dependencias,
        fechaExportacion,
      ] = values;

      // Buscar el servicio en availableServices
      const foundService = availableServices.find(
        (s) =>
          s.name === servicio ||
          s.repo_slug === servicio.toLowerCase().replace(/\s+/g, '-')
      );

      if (!foundService) continue;

      const service: Service = {
        id: servicio,
        name: foundService.name,
        repo_slug: foundService.repo_slug,
        workspace: foundService.workspace,
        project_key: foundService.project_key,
        has_blueprint: foundService.has_blueprint,
        assignedTo: asignado || undefined,
        comment: comentarios || undefined,
        dependencies: dependencias
          ? dependencias
              .split(';')
              .map((dep) => dep.trim())
              .filter(Boolean)
          : undefined,
      };

      // Manejar grupos
      let group = groupMap.get(grupo);
      if (!group) {
        group = {
          id: `group-${Date.now()}-${Math.random()}`,
          name: grupo,
          services: [],
          subGroups: [],
          isExpanded: true,
        };
        groupMap.set(grupo, group);
        groups.push(group);
      }

      // Manejar subgrupos
      if (subgrupo) {
        let subGroup = group.subGroups?.find((sg) => sg.name === subgrupo);
        if (!subGroup) {
          subGroup = {
            id: `subgroup-${Date.now()}-${Math.random()}`,
            name: subgrupo,
            services: [],
            isExpanded: true,
          };
          if (!group.subGroups) group.subGroups = [];
          group.subGroups.push(subGroup);
        }
        subGroup.services.push(service);
      } else {
        group.services.push(service);
      }
    }

    // Actualizar el release plan y el nombre del plan actual
    setReleasePlan({ groups });
    setCurrentPlanName(planName);
    console.log('Plan cargado desde CSV y seleccionado:', planName);
  };

  // Hacer pull desde Bitbucket
  const pullFromBitbucket = async (planName: string) => {
    setIsPulling(true);
    try {
      const credentials = localStorage.getItem('bitbucket-credentials');
      if (!credentials) {
        addToast('error', 'No se encontraron credenciales de Bitbucket');
        setIsPulling(false);
        return;
      }

      const { username, appPassword, workspace } = JSON.parse(credentials);

      // Determinar el nombre del archivo para este plan
      const fileName =
        planName === 'default'
          ? 'release-plan.csv'
          : `release-plan-${planName}.csv`;

      const response = await fetch('/api/bitbucket-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          appPassword,
          workspace,
          repoSlug: bitbucketRepo,
          fileName,
          branch: 'data', // Obtener desde la rama data
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          addToast(
            'error',
            `No se encontró el archivo ${fileName} en Bitbucket. Puede que no haya sido publicado aún.`
          );
          setIsPulling(false);
          return;
        }
        throw new Error('Error al obtener el archivo desde Bitbucket');
      }

      const data = await response.json();
      const csvContent = data.content;

      // Parsear el CSV y actualizar el release plan
      const lines = csvContent
        .split('\n')
        .filter((line: string) => line.trim());
      if (lines.length < 2) {
        addToast('error', 'El archivo CSV está vacío o es inválido');
        setIsPulling(false);
        return;
      }

      // Parsear el CSV directamente
      await parseCSVToReleasePlan(lines, planName);

      addToast(
        'success',
        `Release Plan "${planName}" actualizado desde Bitbucket exitosamente`
      );
    } catch (error) {
      console.error('Error al hacer pull:', error);
      addToast(
        'error',
        `Error al descargar desde Bitbucket: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`
      );
    } finally {
      setIsPulling(false);
    }
  };

  // Publicar a Bitbucket
  const publishToBitbucket = async () => {
    if (!commitMessage.trim()) {
      addToast('error', 'Por favor ingresa un mensaje de commit');
      return;
    }

    setIsSyncing(true);

    try {
      // Obtener credenciales de Bitbucket desde localStorage
      const credentials = localStorage.getItem('bitbucket-credentials');
      if (!credentials) {
        addToast(
          'error',
          'No se encontraron credenciales de Bitbucket. Por favor configúralas primero.'
        );
        setIsSyncing(false);
        return;
      }

      const { username, appPassword, workspace } = JSON.parse(credentials);

      // Generar el CSV completo (sin filtros)
      const exportData: any[] = [];

      // Agregar encabezados de columnas
      exportData.push({
        GRUPO: 'GRUPO',
        SUBGRUPO: 'SUBGRUPO',
        SERVICIO: 'SERVICIO',
        WORKSPACE: 'WORKSPACE',
        PROYECTO: 'PROYECTO',
        BLUEPRINT: 'BLUEPRINT',
        ORDEN: 'ORDEN',
        TIPO: 'TIPO',
        ASIGNADO: 'ASIGNADO',
        COMENTARIOS: 'COMENTARIOS',
        DEPENDENCIAS: 'DEPENDENCIAS',
        FECHA_EXPORTACION: 'FECHA_EXPORTACION',
      });

      let globalOrder = 1;
      const fechaExportacion = new Date().toISOString().split('T')[0];

      // Exportar TODOS los grupos (sin filtros)
      releasePlan.groups.forEach((group) => {
        // Agregar servicios del grupo principal
        if (group.services.length > 0) {
          group.services.forEach((service) => {
            exportData.push({
              GRUPO: group.name,
              SUBGRUPO: '',
              SERVICIO: service.name,
              WORKSPACE: service.workspace,
              PROYECTO: service.project_key,
              BLUEPRINT: service.has_blueprint ? 'Sí' : 'No',
              ORDEN: globalOrder++,
              TIPO: 'SERVICIO',
              ASIGNADO: service.assignedTo || '',
              COMENTARIOS: service.comment || '',
              DEPENDENCIAS: service.dependencies
                ? service.dependencies
                    .map((depId) => {
                      const depService = getAllServices().find(
                        (s) => s.id === depId || s.name === depId
                      );
                      return depService ? depService.name : depId;
                    })
                    .join('; ')
                : '',
              FECHA_EXPORTACION: fechaExportacion,
            });
          });
        }

        // Agregar subgrupos
        if (group.subGroups && group.subGroups.length > 0) {
          group.subGroups.forEach((subGroup) => {
            // Agregar servicios del subgrupo
            if (subGroup.services.length > 0) {
              subGroup.services.forEach((service) => {
                exportData.push({
                  GRUPO: group.name,
                  SUBGRUPO: subGroup.name,
                  SERVICIO: service.name,
                  WORKSPACE: service.workspace,
                  PROYECTO: service.project_key,
                  BLUEPRINT: service.has_blueprint ? 'Sí' : 'No',
                  ORDEN: globalOrder++,
                  TIPO: 'SERVICIO',
                  ASIGNADO: service.assignedTo || '',
                  COMENTARIOS: service.comment || '',
                  DEPENDENCIAS: service.dependencies
                    ? service.dependencies
                        .map((depId) => {
                          const depService = getAllServices().find(
                            (s) => s.id === depId || s.name === depId
                          );
                          return depService ? depService.name : depId;
                        })
                        .join('; ')
                    : '',
                  FECHA_EXPORTACION: fechaExportacion,
                });
              });
            }
          });
        }
      });

      // Convertir a CSV
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.slice(1).map((row) =>
          headers
            .map((header) => {
              const value = String(row[header] || '');
              // Escapar comillas y valores con comas
              if (
                value.includes(',') ||
                value.includes('"') ||
                value.includes('\n')
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',')
        ),
      ].join('\n');

      // Agregar BOM para UTF-8
      const csvWithBOM = '\uFEFF' + csvContent;

      // Usar el nombre del plan para el archivo
      const fileName =
        currentPlanName === 'default'
          ? 'release-plan.csv'
          : `release-plan-${currentPlanName}.csv`;

      // Hacer commit y push usando la API de Bitbucket
      const response = await fetch('/api/bitbucket-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          appPassword,
          workspace,
          repoSlug: bitbucketRepo,
          fileName,
          content: csvWithBOM,
          message: commitMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error de Bitbucket:', errorData);
        throw new Error(errorData.error || 'Error al publicar en Bitbucket');
      }

      addToast('success', 'Release Plan publicado exitosamente en Bitbucket');
      setShowCommitModal(false);
      setCommitMessage('');

      // Recargar planes disponibles desde Bitbucket
      loadAvailablePlans();
    } catch (error) {
      console.error('Error al publicar:', error);
      addToast(
        'error',
        `Error al publicar en Bitbucket: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Saltar la siguiente comilla
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const exportToExcel = () => {
    const filteredGroups = getFilteredGroups();

    if (filteredGroups.length === 0) {
      alert(
        'No hay grupos filtrados para exportar. Ajusta los filtros o crea grupos.'
      );
      return;
    }

    // Crear datos para exportar
    const exportData: any[] = [];

    // Agregar encabezados de columnas para reporte
    exportData.push({
      GRUPO: 'GRUPO',
      SUBGRUPO: 'SUBGRUPO',
      SERVICIO: 'SERVICIO',
      WORKSPACE: 'WORKSPACE',
      PROYECTO: 'PROYECTO',
      BLUEPRINT: 'BLUEPRINT',
      ORDEN: 'ORDEN',
      TIPO: 'TIPO',
      ASIGNADO: 'ASIGNADO',
      COMENTARIOS: 'COMENTARIOS',
      DEPENDENCIAS: 'DEPENDENCIAS',
      FECHA_EXPORTACION: 'FECHA_EXPORTACION',
    });

    let globalOrder = 1;

    const fechaExportacion = new Date().toISOString().split('T')[0];

    filteredGroups.forEach((group, groupIndex) => {
      // Agregar servicios del grupo principal
      if (group.services.length > 0) {
        group.services.forEach((service, serviceIndex) => {
          exportData.push({
            GRUPO: group.name,
            SUBGRUPO: '',
            SERVICIO: service.name,
            WORKSPACE: service.workspace,
            PROYECTO: service.project_key,
            BLUEPRINT: service.has_blueprint ? 'Sí' : 'No',
            ORDEN: globalOrder++,
            TIPO: 'SERVICIO',
            ASIGNADO: service.assignedTo || '',
            COMENTARIOS: service.comment || '',
            DEPENDENCIAS: service.dependencies
              ? service.dependencies
                  .map((depId) => {
                    const depService = getAllServices().find(
                      (s) => s.id === depId
                    );
                    return depService ? depService.name : depId;
                  })
                  .join('; ')
              : '',
            FECHA_EXPORTACION: fechaExportacion,
          });
        });
      }

      // Agregar subgrupos
      if (group.subGroups && group.subGroups.length > 0) {
        group.subGroups.forEach((subGroup, subGroupIndex) => {
          // Agregar servicios del subgrupo
          if (subGroup.services.length > 0) {
            subGroup.services.forEach((service, serviceIndex) => {
              exportData.push({
                GRUPO: group.name,
                SUBGRUPO: subGroup.name,
                SERVICIO: service.name,
                WORKSPACE: service.workspace,
                PROYECTO: service.project_key,
                BLUEPRINT: service.has_blueprint ? 'Sí' : 'No',
                ORDEN: globalOrder++,
                TIPO: 'SERVICIO',
                ASIGNADO: service.assignedTo || '',
                COMENTARIOS: service.comment || '',
                DEPENDENCIAS: service.dependencies
                  ? service.dependencies
                      .map((depId) => {
                        const depService = getAllServices().find(
                          (s) => s.id === depId
                        );
                        return depService ? depService.name : depId;
                      })
                      .join('; ')
                  : '',
                FECHA_EXPORTACION: fechaExportacion,
              });
            });
          }
        });
      }
    });

    // Convertir a CSV con mejor formato
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.slice(1).map((row) =>
        headers
          .map((header) => {
            const value = row[header] || '';
            const stringValue = String(value);
            // Escapar comillas y envolver en comillas si contiene comas o caracteres especiales
            return stringValue.includes(',') ||
              stringValue.includes('"') ||
              stringValue.includes('\n')
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue;
          })
          .join(',')
      ),
    ].join('\n');

    // Agregar BOM para UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    // Generar nombre de archivo con información de filtros
    const generateFileName = () => {
      const date = new Date().toISOString().split('T')[0];
      const baseName = `Reporte-Servicios-Camel-${date}`;

      if (filterGroups.length > 0 || filterSubGroups.length > 0) {
        const filterInfo = [];
        if (filterGroups.length > 0) {
          filterInfo.push(`grupos-${filterGroups.length}`);
        }
        if (filterSubGroups.length > 0) {
          filterInfo.push(`subgrupos-${filterSubGroups.length}`);
        }
        return `${baseName}-filtrado-${filterInfo.join('-')}.csv`;
      }

      return `${baseName}.csv`;
    };

    // Descargar archivo con nombre más descriptivo
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', generateFileName());
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpiar URL
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <TestHistoryProvider historyKey="camelHistory">
        <div className="min-h-screen bg-gray-50">
          <PageHeader
            icon={Container}
            iconColor="text-blue-600"
            title="Release Planner"
            description="Planificación de releases con agrupación de servicios"
            onHistoryOpen={() => setIsHistoryOpen(true)}
            onChatOpen={() => setIsChatOpen(true)}
            currentPage="camel"
            showSectionFilter={true}
          />
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600">Cargando servicios...</p>
            </div>
          </div>
        </div>
      </TestHistoryProvider>
    );
  }

  return (
    <TestHistoryProvider historyKey="camelHistory">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <PageHeader
          icon={Container}
          iconColor="text-blue-600"
          title="Release Planner"
          description="Planificación de releases con agrupación de servicios"
          onHistoryOpen={() => setIsHistoryOpen(true)}
          onChatOpen={() => setIsChatOpen(true)}
          currentPage="camel"
          showSectionFilter={true}
        />

        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs
            items={[
              { label: 'Camel', href: '/camel' },
              { label: 'Release Planner', current: true },
            ]}
          />
        </div>

        {/* Contenido principal */}
        <div
          className={`${
            isFullscreen
              ? 'fixed inset-0 z-40 bg-white'
              : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2'
          }`}
        >
          <div
            className={`bg-white border border-gray-300 rounded-lg ${
              isFullscreen ? 'h-full' : 'h-[calc(100vh-200px)]'
            }`}
          >
            <div className="p-4 h-full flex flex-col">
              {/* Header compacto */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleBack}
                    className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver</span>
                  </button>
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="flex items-center space-x-3">
                        {/* Icono dinámico de estado */}
                        {releasePlan.groups.length > 0 ? (
                          <div className="flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          </div>
                        )}

                        <h2 className="text-lg font-semibold text-gray-900">
                          Release Plan
                        </h2>

                        {/* Selector de planes */}
                        <div className="flex items-center space-x-1">
                          <div className="relative">
                            <button
                              onClick={() => setShowPlanMenu(!showPlanMenu)}
                              className="flex items-center space-x-1.5 px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                              title="Cambiar plan"
                            >
                              <Folder className="w-3 h-3" />
                              <span className="font-medium">
                                {currentPlanName === 'default'
                                  ? 'Default'
                                  : currentPlanName}
                              </span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {/* Menú desplegable de planes */}
                            {showPlanMenu && (
                              <>
                                {/* Overlay para cerrar el menú */}
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setShowPlanMenu(false)}
                                />

                                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                  <div
                                    className={`w-full px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                                      currentPlanName === 'default'
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    <button
                                      onClick={async () => {
                                        await loadReleasePlan('default');
                                        setShowPlanMenu(false);
                                      }}
                                      className="flex items-center space-x-2 flex-1 text-left"
                                    >
                                      <Folder className="w-3 h-3" />
                                      <span>Default</span>
                                    </button>

                                    {/* Icono de pull (solo si Bitbucket está configurado) */}
                                    {bitbucketRepo && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          pullFromBitbucket('default');
                                        }}
                                        disabled={isPulling}
                                        className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                                        title="Descargar desde Bitbucket"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>
                                    )}

                                    {currentPlanName === 'default' && (
                                      <Check className="w-3 h-3" />
                                    )}
                                  </div>

                                  {availablePlans.length > 0 && (
                                    <div className="border-t border-gray-100 my-1" />
                                  )}

                                  {isLoadingPlans ? (
                                    <div className="px-3 py-1.5 text-xs text-gray-500">
                                      Cargando planes...
                                    </div>
                                  ) : (
                                    availablePlans.map((planName) => (
                                      <div
                                        key={planName}
                                        className={`w-full px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                                          currentPlanName === planName
                                            ? 'bg-blue-50 text-blue-600 font-medium'
                                            : 'text-gray-700'
                                        }`}
                                      >
                                        <button
                                          onClick={async () => {
                                            await loadReleasePlan(planName);
                                            setShowPlanMenu(false);
                                          }}
                                          className="flex items-center space-x-2 flex-1 text-left"
                                        >
                                          <Folder className="w-3 h-3" />
                                          <span>{planName}</span>
                                        </button>

                                        {/* Icono de pull (solo si Bitbucket está configurado) */}
                                        {bitbucketRepo && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              pullFromBitbucket(planName);
                                            }}
                                            disabled={isPulling}
                                            className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                                            title="Descargar desde Bitbucket"
                                          >
                                            <Download className="w-3 h-3" />
                                          </button>
                                        )}

                                        {currentPlanName === planName && (
                                          <Check className="w-3 h-3" />
                                        )}
                                      </div>
                                    ))
                                  )}

                                  <div className="border-t border-gray-100 my-1" />

                                  <button
                                    onClick={() => {
                                      setShowPlanMenu(false);
                                      setShowCreatePlanModal(true);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center space-x-2 text-blue-600"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Crear nuevo plan</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Botón de refresh (solo si Bitbucket está configurado) */}
                          {bitbucketRepo && (
                            <button
                              onClick={() => loadAvailablePlans()}
                              disabled={isLoadingPlans}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
                              title="Actualizar planes desde Bitbucket"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${
                                  isLoadingPlans ? 'animate-spin' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={createNewGroup}
                    className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Nuevo Grupo</span>
                  </button>

                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Agregar servicios"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  {/* Botón de pantalla completa */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={
                      isFullscreen
                        ? 'Salir de pantalla completa'
                        : 'Ver en pantalla completa'
                    }
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => setShowImportModal(true)}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Importar Release Plan"
                  >
                    <Upload className="w-5 h-5" />
                  </button>

                  <button
                    onClick={exportToExcel}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Exportar a Excel"
                  >
                    <Download className="w-5 h-5" />
                  </button>

                  {/* Botón de configuración de Bitbucket */}
                  <button
                    onClick={() => setShowBitbucketConfigModal(true)}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Configurar repositorio Bitbucket"
                  >
                    <GitBranch className="w-5 h-5" />
                  </button>

                  {/* Botón de publicar a Bitbucket */}
                  {releasePlan.groups.length > 0 && bitbucketRepo && (
                    <button
                      onClick={openCommitModal}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Publicar en Bitbucket"
                      disabled={isSyncing}
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                  )}

                  {releasePlan.groups.length > 0 && (
                    <button
                      onClick={clearReleasePlan}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Limpiar Release Plan"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  {/* Filtros múltiples */}
                  {releasePlan.groups.length > 0 && (
                    <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-gray-200">
                      {/* Selector múltiple de grupos */}
                      <div className="relative group">
                        <button
                          className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer flex items-center space-x-1"
                          title="Filtrar por grupos"
                        >
                          <span>Grupos</span>
                          <span className="text-xs text-gray-400">
                            {filterGroups.length > 0
                              ? `(${filterGroups.length})`
                              : ''}
                          </span>
                          <Filter className="w-3 h-3" />
                        </button>

                        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                          <div className="p-2 max-h-40 overflow-y-auto">
                            {releasePlan.groups.map((group) => (
                              <label
                                key={group.id}
                                className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={filterGroups.includes(group.name)}
                                  onChange={() =>
                                    handleGroupFilterChange(group.name)
                                  }
                                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-gray-700">
                                  {group.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Selector múltiple de subgrupos */}
                      <div className="relative group">
                        <button
                          className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer flex items-center space-x-1"
                          title="Filtrar por subgrupos"
                        >
                          <span>Subgrupos</span>
                          <span className="text-xs text-gray-400">
                            {filterSubGroups.length > 0
                              ? `(${filterSubGroups.length})`
                              : ''}
                          </span>
                          <Filter className="w-3 h-3" />
                        </button>

                        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                          <div className="p-2 max-h-40 overflow-y-auto">
                            {releasePlan.groups.flatMap(
                              (group) =>
                                group.subGroups?.map((subGroup) => (
                                  <label
                                    key={subGroup.id}
                                    className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={filterSubGroups.includes(
                                        subGroup.name
                                      )}
                                      onChange={() =>
                                        handleSubGroupFilterChange(
                                          subGroup.name
                                        )
                                      }
                                      className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">
                                      {subGroup.name}
                                    </span>
                                  </label>
                                )) || []
                            )}
                          </div>
                        </div>
                      </div>

                      {(filterGroups.length > 0 ||
                        filterSubGroups.length > 0) && (
                        <button
                          onClick={clearFilters}
                          className="p-0.5 text-gray-400 hover:text-gray-600"
                          title="Limpiar filtros"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Área de grupos */}
              <div className="flex-1 overflow-auto">
                {releasePlan.groups.length === 0 ? (
                  <div className="text-center py-8">
                    <Folder className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-3">
                      No hay grupos creados. Crea tu primer grupo para comenzar.
                    </p>
                    <button
                      onClick={createNewGroup}
                      className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear Primer Grupo</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getFilteredGroups().map((group, groupIndex) => (
                      <div key={group.id}>
                        <div className="border border-gray-200 rounded-lg">
                          {/* Header del grupo compacto */}
                          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between rounded-t-lg">
                            <div className="flex items-center space-x-2">
                              {/* Botones de movimiento para grupos */}
                              <div className="flex items-center space-x-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveGroup(group.id, 'up');
                                  }}
                                  disabled={groupIndex === 0}
                                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Mover grupo arriba"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveGroup(group.id, 'down');
                                  }}
                                  disabled={
                                    groupIndex === releasePlan.groups.length - 1
                                  }
                                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Mover grupo abajo"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Área clickeable del header */}
                              <button
                                onClick={() => toggleGroupExpansion(group.id)}
                                className="flex items-center space-x-2 hover:bg-gray-200 rounded p-1 -m-1 flex-1"
                              >
                                {group.isExpanded ? (
                                  <Minus className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <Plus className="w-4 h-4 text-gray-600" />
                                )}

                                {group.isExpanded ? (
                                  <FolderOpen className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Folder className="w-4 h-4 text-blue-600" />
                                )}

                                {editingGroup?.id === group.id &&
                                editingGroup.type === 'group' ? (
                                  <div className="flex items-center space-x-1">
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) =>
                                        setEditingName(e.target.value)
                                      }
                                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveGroupName();
                                        if (e.key === 'Escape')
                                          cancelEditingGroup();
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        saveGroupName();
                                      }}
                                      className="p-1 text-green-600 hover:text-green-700"
                                      title="Guardar"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cancelEditingGroup();
                                      }}
                                      className="p-1 text-red-600 hover:text-red-700"
                                      title="Cancelar"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-medium text-gray-900 text-sm">
                                      {group.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({getTotalServicesInGroup(group)}{' '}
                                      servicios)
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => createSubGroup(group.id)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Crear subgrupo"
                              >
                                <Plus className="w-3 h-3" />
                              </button>

                              {editingGroup?.id !== group.id && (
                                <button
                                  onClick={() =>
                                    startEditingGroup(group.id, 'group')
                                  }
                                  className="p-1 text-gray-400 hover:text-blue-600"
                                  title="Editar nombre"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                onClick={() => deleteGroup(group.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Eliminar grupo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Contenido del grupo */}
                          {group.isExpanded && (
                            <div className="p-3 rounded-b-lg">
                              {/* Servicios del grupo compactos */}
                              {group.services.length > 0 && (
                                <div className="mb-3">
                                  <div className="text-xs font-medium text-gray-700 mb-2">
                                    Servicios del Grupo ({group.services.length}
                                    )
                                  </div>
                                  <div className="space-y-1">
                                    {group.services.map((service, index) => (
                                      <div key={service.id}>
                                        <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs">
                                          <div className="flex items-center space-x-2">
                                            {/* Botones de movimiento para servicios */}
                                            <div className="flex items-center space-x-0.5">
                                              <button
                                                onClick={() =>
                                                  moveServiceWithinGroup(
                                                    group.id,
                                                    service.id,
                                                    'up'
                                                  )
                                                }
                                                disabled={index === 0}
                                                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Mover servicio arriba"
                                              >
                                                <ChevronUp className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() =>
                                                  moveServiceWithinGroup(
                                                    group.id,
                                                    service.id,
                                                    'down'
                                                  )
                                                }
                                                disabled={
                                                  index ===
                                                  group.services.length - 1
                                                }
                                                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Mover servicio abajo"
                                              >
                                                <ChevronDown className="w-3 h-3" />
                                              </button>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="font-medium text-gray-900 truncate">
                                                {service.has_blueprint ? (
                                                  <button
                                                    onClick={() =>
                                                      handleServiceDetailClick(
                                                        service
                                                      )
                                                    }
                                                    className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                                    title="Ver detalle del servicio"
                                                  >
                                                    {service.name}
                                                  </button>
                                                ) : (
                                                  <span>{service.name}</span>
                                                )}
                                              </div>
                                              <div className="text-gray-500 truncate">
                                                {service.workspace} /{' '}
                                                {service.project_key}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center space-x-1">
                                            {/* Icono de dependencias */}
                                            <button
                                              onClick={() =>
                                                startEditingDependencies(
                                                  service.id
                                                )
                                              }
                                              className={`p-0.5 rounded flex items-center space-x-1 ${
                                                service.dependencies &&
                                                service.dependencies.length > 0
                                                  ? 'text-blue-600 hover:text-blue-700'
                                                  : 'text-gray-400 hover:text-blue-600'
                                              }`}
                                              title={
                                                service.dependencies &&
                                                service.dependencies.length > 0
                                                  ? `${service.dependencies.length} dependencias`
                                                  : 'Gestionar dependencias'
                                              }
                                            >
                                              <GitBranch className="w-3 h-3" />
                                              {service.dependencies &&
                                                service.dependencies.length >
                                                  0 && (
                                                  <span className="text-xs text-gray-400">
                                                    {
                                                      service.dependencies
                                                        .length
                                                    }
                                                  </span>
                                                )}
                                            </button>

                                            {/* Icono de comentario */}
                                            <button
                                              onClick={() =>
                                                startEditingService(
                                                  service.id,
                                                  'comment',
                                                  service.comment || ''
                                                )
                                              }
                                              className={`p-0.5 rounded ${
                                                service.comment
                                                  ? 'text-blue-600 hover:text-blue-700'
                                                  : 'text-gray-400 hover:text-blue-600'
                                              }`}
                                              title={
                                                service.comment ||
                                                'Agregar comentario'
                                              }
                                            >
                                              <MessageSquare className="w-3 h-3" />
                                            </button>

                                            {/* Icono de persona asignada */}
                                            <button
                                              onClick={() =>
                                                startEditingService(
                                                  service.id,
                                                  'assignedTo',
                                                  service.assignedTo || ''
                                                )
                                              }
                                              className={`p-0.5 rounded flex items-center space-x-1 ${
                                                service.assignedTo
                                                  ? 'text-green-600 hover:text-green-700'
                                                  : 'text-gray-400 hover:text-green-600'
                                              }`}
                                              title={
                                                service.assignedTo ||
                                                'Asignar persona'
                                              }
                                            >
                                              <User className="w-3 h-3" />
                                              {service.assignedTo && (
                                                <span className="text-xs text-gray-400">
                                                  {service.assignedTo}
                                                </span>
                                              )}
                                            </button>

                                            {/* Selector de subgrupo */}
                                            <select
                                              value=""
                                              onChange={(e) => {
                                                const targetSubGroupId =
                                                  e.target.value === 'main'
                                                    ? null
                                                    : e.target.value;
                                                moveServiceToSubGroup(
                                                  group.id,
                                                  service.id,
                                                  targetSubGroupId
                                                );
                                                e.target.value = ''; // Reset selection
                                              }}
                                              className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                              title="Mover a subgrupo"
                                            >
                                              <option value="">
                                                Mover a...
                                              </option>
                                              <option value="main">
                                                Grupo Principal
                                              </option>
                                              {group.subGroups?.map(
                                                (subGroup) => (
                                                  <option
                                                    key={subGroup.id}
                                                    value={subGroup.id}
                                                  >
                                                    {subGroup.name}
                                                  </option>
                                                )
                                              )}
                                            </select>
                                            <button
                                              onClick={() =>
                                                removeServiceFromGroup(
                                                  group.id,
                                                  service.id
                                                )
                                              }
                                              className="p-0.5 text-gray-400 hover:text-red-600"
                                              title="Eliminar del grupo"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Subgrupos compactos */}
                              {group.subGroups &&
                                group.subGroups.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="text-xs font-medium text-gray-700 mb-2">
                                      Subgrupos ({group.subGroups.length})
                                    </div>

                                    {group.subGroups.map(
                                      (subGroup, subGroupIndex) => (
                                        <div
                                          key={subGroup.id}
                                          className="border border-gray-200 rounded-lg"
                                        >
                                          <div className="bg-gray-100 px-2 py-1 border-b border-gray-200 flex items-center justify-between rounded-t-lg">
                                            <div className="flex items-center space-x-2">
                                              {/* Botones de movimiento para subgrupos */}
                                              <div className="flex items-center space-x-0.5">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveSubGroup(
                                                      group.id,
                                                      subGroup.id,
                                                      'up'
                                                    );
                                                  }}
                                                  disabled={subGroupIndex === 0}
                                                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                  title="Mover subgrupo arriba"
                                                >
                                                  <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveSubGroup(
                                                      group.id,
                                                      subGroup.id,
                                                      'down'
                                                    );
                                                  }}
                                                  disabled={
                                                    subGroupIndex ===
                                                    (group.subGroups?.length ||
                                                      0) -
                                                      1
                                                  }
                                                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                  title="Mover subgrupo abajo"
                                                >
                                                  <ChevronDown className="w-3 h-3" />
                                                </button>
                                              </div>

                                              {/* Área clickeable del header del subgrupo */}
                                              <button
                                                onClick={() =>
                                                  toggleSubGroupExpansion(
                                                    group.id,
                                                    subGroup.id
                                                  )
                                                }
                                                className="flex items-center space-x-1 hover:bg-gray-200 rounded p-0.5 -m-0.5 flex-1"
                                              >
                                                {subGroup.isExpanded ? (
                                                  <Minus className="w-3 h-3 text-gray-600" />
                                                ) : (
                                                  <Plus className="w-3 h-3 text-gray-600" />
                                                )}
                                                <Folder className="w-3 h-3 text-gray-600" />
                                                {editingGroup?.id ===
                                                  subGroup.id &&
                                                editingGroup.type ===
                                                  'subgroup' ? (
                                                  <div className="flex items-center space-x-1">
                                                    <input
                                                      type="text"
                                                      value={editingName}
                                                      onChange={(e) =>
                                                        setEditingName(
                                                          e.target.value
                                                        )
                                                      }
                                                      className="px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                      autoFocus
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter')
                                                          saveGroupName();
                                                        if (e.key === 'Escape')
                                                          cancelEditingGroup();
                                                      }}
                                                    />
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        saveGroupName();
                                                      }}
                                                      className="p-0.5 text-green-600 hover:text-green-700"
                                                      title="Guardar"
                                                    >
                                                      <Check className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        cancelEditingGroup();
                                                      }}
                                                      className="p-0.5 text-red-600 hover:text-red-700"
                                                      title="Cancelar"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <span className="font-medium text-gray-900 text-xs">
                                                      {subGroup.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                      (
                                                      {subGroup.services.length}{' '}
                                                      servicios)
                                                    </span>
                                                  </>
                                                )}
                                              </button>
                                            </div>

                                            <div className="flex items-center space-x-1">
                                              {editingGroup?.id !==
                                                subGroup.id && (
                                                <button
                                                  onClick={() =>
                                                    startEditingGroup(
                                                      subGroup.id,
                                                      'subgroup',
                                                      group.id
                                                    )
                                                  }
                                                  className="p-0.5 text-gray-400 hover:text-blue-600"
                                                  title="Editar nombre"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                              )}

                                              <button
                                                onClick={() =>
                                                  deleteSubGroup(
                                                    group.id,
                                                    subGroup.id
                                                  )
                                                }
                                                className="p-0.5 text-gray-400 hover:text-red-600"
                                                title="Eliminar subgrupo y todo su contenido"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>

                                          {subGroup.isExpanded && (
                                            <div className="p-2 space-y-1 rounded-b-lg">
                                              {subGroup.services.map(
                                                (service, index) => (
                                                  <div key={service.id}>
                                                    <div className="flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded text-xs">
                                                      <div className="flex items-center space-x-1.5">
                                                        {/* Botones de movimiento para servicios en subgrupos */}
                                                        <div className="flex items-center space-x-0.5">
                                                          <button
                                                            onClick={() =>
                                                              moveServiceWithinGroup(
                                                                group.id,
                                                                service.id,
                                                                'up',
                                                                subGroup.id
                                                              )
                                                            }
                                                            disabled={
                                                              index === 0
                                                            }
                                                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Mover servicio arriba"
                                                          >
                                                            <ChevronUp className="w-3 h-3" />
                                                          </button>
                                                          <button
                                                            onClick={() =>
                                                              moveServiceWithinGroup(
                                                                group.id,
                                                                service.id,
                                                                'down',
                                                                subGroup.id
                                                              )
                                                            }
                                                            disabled={
                                                              index ===
                                                              subGroup.services
                                                                .length -
                                                                1
                                                            }
                                                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Mover servicio abajo"
                                                          >
                                                            <ChevronDown className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                          <div className="font-medium text-gray-900 truncate">
                                                            {service.has_blueprint ? (
                                                              <button
                                                                onClick={() =>
                                                                  handleServiceDetailClick(
                                                                    service
                                                                  )
                                                                }
                                                                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                                                title="Ver detalle del servicio"
                                                              >
                                                                {service.name}
                                                              </button>
                                                            ) : (
                                                              <span>
                                                                {service.name}
                                                              </span>
                                                            )}
                                                          </div>
                                                          <div className="text-gray-500 truncate">
                                                            {service.workspace}{' '}
                                                            /{' '}
                                                            {
                                                              service.project_key
                                                            }
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div className="flex items-center space-x-1">
                                                        {/* Icono de dependencias */}
                                                        <button
                                                          onClick={() =>
                                                            startEditingDependencies(
                                                              service.id
                                                            )
                                                          }
                                                          className={`p-0.5 rounded flex items-center space-x-1 ${
                                                            service.dependencies &&
                                                            service.dependencies
                                                              .length > 0
                                                              ? 'text-blue-600 hover:text-blue-700'
                                                              : 'text-gray-400 hover:text-blue-600'
                                                          }`}
                                                          title={
                                                            service.dependencies &&
                                                            service.dependencies
                                                              .length > 0
                                                              ? `${service.dependencies.length} dependencias`
                                                              : 'Gestionar dependencias'
                                                          }
                                                        >
                                                          <GitBranch className="w-3 h-3" />
                                                          {service.dependencies &&
                                                            service.dependencies
                                                              .length > 0 && (
                                                              <span className="text-xs text-gray-400">
                                                                {
                                                                  service
                                                                    .dependencies
                                                                    .length
                                                                }
                                                              </span>
                                                            )}
                                                        </button>

                                                        {/* Icono de comentario */}
                                                        <button
                                                          onClick={() =>
                                                            startEditingService(
                                                              service.id,
                                                              'comment',
                                                              service.comment ||
                                                                ''
                                                            )
                                                          }
                                                          className={`p-0.5 rounded ${
                                                            service.comment
                                                              ? 'text-blue-600 hover:text-blue-700'
                                                              : 'text-gray-400 hover:text-blue-600'
                                                          }`}
                                                          title={
                                                            service.comment ||
                                                            'Agregar comentario'
                                                          }
                                                        >
                                                          <MessageSquare className="w-3 h-3" />
                                                        </button>

                                                        {/* Icono de persona asignada */}
                                                        <button
                                                          onClick={() =>
                                                            startEditingService(
                                                              service.id,
                                                              'assignedTo',
                                                              service.assignedTo ||
                                                                ''
                                                            )
                                                          }
                                                          className={`p-0.5 rounded flex items-center space-x-1 ${
                                                            service.assignedTo
                                                              ? 'text-green-600 hover:text-green-700'
                                                              : 'text-gray-400 hover:text-green-600'
                                                          }`}
                                                          title={
                                                            service.assignedTo ||
                                                            'Asignar persona'
                                                          }
                                                        >
                                                          <User className="w-3 h-3" />
                                                          {service.assignedTo && (
                                                            <span className="text-xs text-gray-400">
                                                              {
                                                                service.assignedTo
                                                              }
                                                            </span>
                                                          )}
                                                        </button>

                                                        {/* Selector de subgrupo */}
                                                        <select
                                                          value=""
                                                          onChange={(e) => {
                                                            const targetSubGroupId =
                                                              e.target.value ===
                                                              'main'
                                                                ? null
                                                                : e.target
                                                                    .value;
                                                            moveServiceToSubGroup(
                                                              group.id,
                                                              service.id,
                                                              targetSubGroupId
                                                            );
                                                            e.target.value = ''; // Reset selection
                                                          }}
                                                          className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                          title="Mover a subgrupo"
                                                        >
                                                          <option value="">
                                                            Mover a...
                                                          </option>
                                                          <option value="main">
                                                            Grupo Principal
                                                          </option>
                                                          {group.subGroups?.map(
                                                            (sg) => (
                                                              <option
                                                                key={sg.id}
                                                                value={sg.id}
                                                              >
                                                                {sg.name}
                                                              </option>
                                                            )
                                                          )}
                                                        </select>

                                                        <button
                                                          onClick={() =>
                                                            removeServiceFromGroup(
                                                              subGroup.id,
                                                              service.id
                                                            )
                                                          }
                                                          className="p-0.5 text-gray-400 hover:text-red-600"
                                                          title="Eliminar del subgrupo"
                                                        >
                                                          <Trash2 className="w-3 h-3" />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Búsqueda de Servicios */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Buscar y Agregar Servicios
                </h3>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchTerm('');
                    setSelectedGroupId('');
                    setSelectedSubGroupId('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Grupo y Búsqueda */}
              <div className="p-3 border-b border-gray-200 space-y-3">
                {/* Selector de Grupo */}
                <div className="flex space-x-2">
                  <select
                    value={selectedGroupId}
                    onChange={(e) => {
                      setSelectedGroupId(e.target.value);
                      setSelectedSubGroupId(''); // Reset subgrupo al cambiar grupo
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Seleccionar grupo...</option>
                    {getFilteredGroups().map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>

                  {selectedGroupId && (
                    <select
                      value={selectedSubGroupId}
                      onChange={(e) => setSelectedSubGroupId(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Grupo principal</option>
                      {releasePlan.groups
                        .find((g) => g.id === selectedGroupId)
                        ?.subGroups?.map((subGroup) => (
                          <option key={subGroup.id} value={subGroup.id}>
                            {subGroup.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar servicios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista de Servicios */}
              <div className="flex-1 overflow-auto p-3">
                {filteredAvailableServices.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {searchTerm
                        ? 'No se encontraron servicios'
                        : 'No hay servicios disponibles'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredAvailableServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {service.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {service.workspace} / {service.project_key}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-3">
                          {selectedGroupId ? (
                            <button
                              onClick={() =>
                                addServiceToSelectedGroup(service.id)
                              }
                              className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200"
                              title={`Agregar a ${
                                selectedSubGroupId
                                  ? releasePlan.groups
                                      .find((g) => g.id === selectedGroupId)
                                      ?.subGroups?.find(
                                        (sg) => sg.id === selectedSubGroupId
                                      )?.name
                                  : releasePlan.groups.find(
                                      (g) => g.id === selectedGroupId
                                    )?.name
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="text-xs text-gray-400 px-2 py-1">
                              Selecciona un grupo
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Importación */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">
                  Importar Release Plan
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div className="p-3 space-y-3">
                <div className="text-xs text-gray-600">
                  Selecciona un archivo CSV exportado previamente.
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <div className="text-xs text-gray-600 mb-2">
                    Arrastra un archivo CSV aquí o haz clic para seleccionar
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={importReleasePlan}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 mr-1.5" />
                    Seleccionar Archivo
                  </label>
                </div>

                <div className="text-xs text-gray-500">
                  <strong>Formato:</strong> CSV con columnas GRUPO, SUBGRUPO,
                  SERVICIO, WORKSPACE, PROYECTO, BLUEPRINT, ORDEN, TIPO,
                  ASIGNADO, COMENTARIOS, DEPENDENCIAS, FECHA_EXPORTACION
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Dependencias */}
        {showDependenciesModal && editingService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Gestionar Dependencias
                  </h3>
                  {editingService && (
                    <p className="text-xs text-gray-500 mt-1">
                      {getReleasePlanServices().find(
                        (s) => s.id === editingService.id
                      )?.dependencies?.length || 0}{' '}
                      dependencias seleccionadas
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowDependenciesModal(false);
                    setEditingService(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div className="p-3 space-y-3">
                <div className="text-xs text-gray-600">
                  Selecciona los servicios de los que depende este servicio.
                </div>

                {/* Buscador minimalista */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar servicios..."
                    value={dependenciesSearchTerm}
                    onChange={(e) => setDependenciesSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {(() => {
                    const filteredServices =
                      getFilteredServicesForDependencies().filter(
                        (service) => service.id !== editingService.id
                      );

                    const selectedDependencies = editingService
                      ? getReleasePlanServices().find(
                          (s) => s.id === editingService.id
                        )?.dependencies || []
                      : [];

                    const selectedServices = filteredServices.filter(
                      (service) =>
                        selectedDependencies.includes(service.id) ||
                        selectedDependencies.includes(service.name)
                    );
                    const unselectedServices = filteredServices.filter(
                      (service) =>
                        !selectedDependencies.includes(service.id) &&
                        !selectedDependencies.includes(service.name)
                    );

                    return (
                      <>
                        {/* Servicios seleccionados */}
                        {selectedServices.length > 0 && (
                          <>
                            <div className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                              Dependencias Seleccionadas (
                              {selectedServices.length})
                            </div>
                            {selectedServices.map((service) => {
                              const isSelected = true; // Ya sabemos que están seleccionados
                              return (
                                <label
                                  key={service.id}
                                  className="flex items-center space-x-2 text-xs cursor-pointer p-2 rounded transition-colors bg-blue-50 border border-blue-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      if (editingService) {
                                        handleDependencyToggle(
                                          editingService.id,
                                          service.id
                                        );
                                      }
                                    }}
                                    className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-blue-900">
                                      {service.name}
                                    </div>
                                  </div>
                                  <div className="text-blue-600 text-xs font-medium">
                                    ✓ Seleccionado
                                  </div>
                                </label>
                              );
                            })}
                          </>
                        )}

                        {/* Separador si hay servicios seleccionados y no seleccionados */}
                        {selectedServices.length > 0 &&
                          unselectedServices.length > 0 && (
                            <div className="border-t border-gray-200 my-2"></div>
                          )}

                        {/* Servicios no seleccionados */}
                        {unselectedServices.length > 0 && (
                          <>
                            {selectedServices.length > 0 && (
                              <div className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                Otros Servicios Disponibles
                              </div>
                            )}
                            {unselectedServices.map((service) => {
                              const isSelected = false; // Ya sabemos que no están seleccionados
                              return (
                                <label
                                  key={service.id}
                                  className="flex items-center space-x-2 text-xs cursor-pointer p-2 rounded transition-colors hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      if (editingService) {
                                        handleDependencyToggle(
                                          editingService.id,
                                          service.id
                                        );
                                      }
                                    }}
                                    className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {service.name}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })()}

                  {/* Mensaje cuando no hay resultados */}
                  {getFilteredServicesForDependencies().filter(
                    (service) => service.id !== editingService.id
                  ).length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-xs">
                      {dependenciesSearchTerm.trim()
                        ? 'No se encontraron servicios con ese criterio'
                        : 'No hay servicios disponibles'}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowDependenciesModal(false);
                      setEditingService(null);
                    }}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar de Historial */}
        <HistorySidebar
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          historyKey="camelHistory"
          showSectionFilter={true}
        />

        {/* Modal de Edición de Servicio */}
        {editingService && editingService.field !== 'dependencies' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">
                  {editingService.field === 'comment'
                    ? 'Comentario'
                    : 'Persona Asignada'}
                </h3>
                <button
                  onClick={cancelEditingService}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div className="p-3 space-y-3">
                <div className="text-xs text-gray-600">
                  {editingService.field === 'comment'
                    ? 'Agrega un comentario para este servicio'
                    : 'Asigna una persona responsable para este servicio'}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    placeholder={
                      editingService.field === 'comment'
                        ? 'Escribe un comentario...'
                        : 'Nombre de la persona...'
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveServiceField();
                      if (e.key === 'Escape') cancelEditingService();
                    }}
                  />
                </div>

                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={cancelEditingService}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveServiceField}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar de Chat IA */}
        <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* Toasts */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm ${
                toast.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  toast.type === 'success'
                    ? 'bg-green-500'
                    : toast.type === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
              />
              <span className="text-sm font-medium flex-1">
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Modal para crear nuevo plan */}
        {showCreatePlanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Crear Nuevo Release Plan
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Plan
                  </label>
                  <input
                    type="text"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="Ej: release-q1-2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Solo letras, números y guiones. Se convertirá a minúsculas.
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowCreatePlanModal(false);
                      setNewPlanName('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createNewPlan}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Crear Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de credenciales de Bitbucket */}
        {showBitbucketCredentialsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Configurar Credenciales de Bitbucket
                </h3>
                <button
                  onClick={() => setShowBitbucketCredentialsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={bitbucketUsername}
                    onChange={(e) => setBitbucketUsername(e.target.value)}
                    placeholder="tu-usuario"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={bitbucketAppPassword}
                    onChange={(e) => setBitbucketAppPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Crea un API Token en{' '}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Atlassian API Tokens
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace
                  </label>
                  <input
                    type="text"
                    value={bitbucketWorkspace}
                    onChange={(e) => setBitbucketWorkspace(e.target.value)}
                    placeholder="tu-workspace"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setShowBitbucketCredentialsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveBitbucketCredentials}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de configuración de Bitbucket */}
        {showBitbucketConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Configurar Repositorio Bitbucket
                </h3>
                <button
                  onClick={() => setShowBitbucketCredentialsModal(true)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Configurar credenciales de Bitbucket"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Repositorio
                  </label>
                  <input
                    type="text"
                    value={bitbucketRepo}
                    onChange={(e) => setBitbucketRepo(e.target.value)}
                    placeholder="Ej: release-plans"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    El repositorio debe existir en tu workspace de Bitbucket
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowBitbucketConfigModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveBitbucketConfig}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de commit/publicación */}
        {showCommitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Publicar Release Plan
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje de Commit
                  </label>
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Ej: Release inicial con 27 servicios"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Repositorio: {bitbucketRepo} | Rama: data
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowCommitModal(false)}
                    disabled={isSyncing}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={publishToBitbucket}
                    disabled={isSyncing}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSyncing ? (
                      <>
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Publicar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TestHistoryProvider>
  );
}
