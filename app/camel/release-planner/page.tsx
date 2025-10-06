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
    field: 'comment' | 'assignedTo';
  } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSubGroupId, setSelectedSubGroupId] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<string[]>([]);
  const [filterSubGroups, setFilterSubGroups] = useState<string[]>([]);

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

  // Cargar Release Plan desde localStorage
  useEffect(() => {
    const savedPlan = localStorage.getItem('release-plan');
    if (savedPlan) {
      try {
        const parsedPlan = JSON.parse(savedPlan);
        setReleasePlan(parsedPlan);
      } catch (error) {
        console.error(
          'Error al cargar Release Plan desde localStorage:',
          error
        );
      }
    }
  }, []);

  // Guardar Release Plan en localStorage cuando cambie
  useEffect(() => {
    if (releasePlan.groups.length > 0) {
      localStorage.setItem('release-plan', JSON.stringify(releasePlan));
    }
  }, [releasePlan]);

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
          alert('El archivo está vacío o no contiene datos válidos.');
          return;
        }

        // Parsear CSV
        const importedGroups: Group[] = [];
        const groupMap = new Map<string, Group>();
        const subGroupMap = new Map<
          string,
          { group: Group; subGroup: Group }
        >();

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

          // Crear servicio
          const service = {
            id: `service-${Date.now()}-${Math.random()}`,
            name: servicio,
            workspace: workspace || '',
            project_key: proyecto || '',
            repo_slug: servicio.toLowerCase().replace(/\s+/g, '-'), // Generar repo_slug basado en el nombre
            has_blueprint:
              blueprint?.toLowerCase() === 'sí' ||
              blueprint?.toLowerCase() === 'si',
            assignedTo: asignado || '',
            comment: comentarios || '',
          };

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

        if (importedGroups.length > 0) {
          setReleasePlan({ groups: importedGroups });
          setShowImportModal(false);
          alert(
            `Release plan importado exitosamente: ${importedGroups.length} grupos, ${dataLines.length} servicios.`
          );
        } else {
          alert('No se pudieron importar datos válidos del archivo.');
        }
      } catch (error) {
        console.error('Error al importar:', error);
        alert('Error al procesar el archivo. Verifica que sea un CSV válido.');
      }
    };

    reader.readAsText(file, 'UTF-8');
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
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Release Plan
                    </h2>
                    {releasePlan.groups.length > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Guardado</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={createNewGroup}
                    className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Grupo</span>
                  </button>

                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Buscar servicios"
                  >
                    <Search className="w-5 h-5" />
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
                                                {service.name}
                                              </div>
                                              <div className="text-gray-500 truncate">
                                                {service.workspace} /{' '}
                                                {service.project_key}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center space-x-1">
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
                                                            {service.name}
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
                  FECHA_EXPORTACION
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
        {editingService && (
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
      </div>
    </TestHistoryProvider>
  );
}
