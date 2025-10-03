'use client';

import { useState, useEffect } from 'react';
import { Search, GitBranch, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Repository {
  workspace: string;
  project_key: string;
  repo_slug: string;
  repo_name: string;
  is_private: boolean;
  main_branch: string;
  language: string;
  created_on: string;
  updated_on: string;
  size_bytes: number;
  html_url: string;
  https_url: string;
  ssh_url: string;
  has_blueprint: boolean;
}

export default function CamelRepositoriesTable() {
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<
    Repository[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [blueprintFilter, setBlueprintFilter] = useState<
    'all' | 'available' | 'unavailable'
  >('all');
  const [isLoading, setIsLoading] = useState(true);

  const handleRowClick = (repoSlug: string, hasBlueprint: boolean) => {
    if (hasBlueprint) {
      router.push(`/camel/${repoSlug}`);
    }
  };

  // Cargar datos del CSV
  useEffect(() => {
    const loadRepositories = async () => {
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

        // Filtrar solo los repositorios que están en la lista
        const repos: Repository[] = listaRepos.map((repoSlug) => {
          const bitbucketData = bitbucketMap.get(repoSlug);
          if (bitbucketData) {
            return {
              ...bitbucketData,
              has_blueprint: false, // Se verificará después
            };
          } else {
            // Si no está en Bitbucket, crear un objeto básico
            return {
              workspace: 'N/A',
              project_key: 'N/A',
              repo_slug: repoSlug,
              repo_name: repoSlug,
              is_private: false,
              main_branch: 'N/A',
              language: 'N/A',
              created_on: 'N/A',
              updated_on: 'N/A',
              size_bytes: 0,
              html_url: '#',
              https_url: '#',
              ssh_url: '#',
              has_blueprint: false,
            };
          }
        });

        // Lista de repositorios que tienen blueprint (basado en las carpetas existentes)
        const blueprintsList = [
          'coopeuch-migracion-cdig-rsfirmatoc',
          'coopeuch-migracion-convenios-rsauditoria',
          'coopeuch-migracion-convenios-rsautenticacionidg',
          'coopeuch-migracion-convenios-rsbeneficiosportalconvenios',
          'coopeuch-migracion-convenios-rsdetallesplanilla',
          'coopeuch-migracion-convenios-rsorquestacioncreditospendientes',
          'coopeuch-migracion-convenios-rsotpidg',
          'coopeuch-migracion-convenios-rsplanillaconvenio',
          'coopeuch-migracion-convenios-rsserviciopermisosusuario',
          'coopeuch-migracion-convenios-rsserviciousuarioconvenio',
          'coopeuch-migracion-convenios-rssolicitudconvenio',
          'coopeuch-migracion-convenios-rssolicitudcreditovb',
          'coopeuch-migracion-convenios-rsusuarioportalconvenios',
          'coopeuch-migracion-convenios-rsvistobueno',
          'coopeuch-migracion-corredoraseguros-rscobertura',
          'coopeuch-migracion-corredoraseguros-rscomision',
          'coopeuch-migracion-corredoraseguros-rscomisionsecuencia',
          'coopeuch-migracion-corredoraseguros-rscompania',
          'coopeuch-migracion-corredoraseguros-rsgestionseguro',
          'coopeuch-migracion-corredoraseguros-rsparametrosgenerales',
          'coopeuch-migracion-corredoraseguros-rsplan',
          'coopeuch-migracion-corredoraseguros-rsproducto',
          'coopeuch-migracion-corredoraseguros-rsseguro',
          'coopeuch-migracion-corredoraseguros-rssegurosgenerales',
          'coopeuch-migracion-corredoraseguros-rssegurowrapper',
          'coopeuch-migracion-crm-rscreditolisto',
          'coopeuch-migracion-crm-rscrmivic',
          'coopeuch-migracion-crm-rshorario',
          'coopeuch-migracion-crm-rsportabilidad',
          'coopeuch-migracion-crm-rsregistroatencion',
          'coopeuch-migracion-crm-rsreprogramacioncredito',
          'coopeuch-migracion-crm-rsreprogramacioncuotas',
          'coopeuch-migracion-crm-rsrequerimientooficio',
          'coopeuch-migracion-crm-rsrequerimientosembargo',
          'coopeuch-migracion-crm-rssincronizacion',
          'coopeuch-migracion-crm-rssolicitudessocio',
          'coopeuch-migracion-crm-rssolicitudesweb',
          'coopeuch-migracion-dale-rscuentavista',
          'coopeuch-migracion-dale-rstarjetaprepago',
          'coopeuch-migracion-merp-rscalcularpmt',
          'coopeuch-migracion-mq-log',
          'coopeuch-migracion-mq-logcalculoscredito',
          'coopeuch-migracion-mq-lognotificaciones-ci',
          'coopeuch-migracion-mq-logtef',
          'coopeuch-migracion-mqactualizacionfinanciera',
          'coopeuch-migracion-mqconectorsinacofi',
          'coopeuch-migracion-mqnotificacioncredito-ci',
          'coopeuch-migracion-mqnotificacionsolicitud-ci',
          'coopeuch-migracion-mqnotificacionteflifa-ci',
          'coopeuch-migracion-mqregistrarsimulacionbigdata-ci',
          'coopeuch-migracion-mqticketdocumento',
          'coopeuch-migracion-nominastef-rsparametros',
          'coopeuch-migracion-nominastef-rsvalidatef',
          'coopeuch-migracion-prueba-jorge-coopeuch',
          'coopeuch-migracion-rs3ds',
          'coopeuch-migracion-rsabonomasivoremuneraciones',
          'coopeuch-migracion-rsactualizacionfinanciera',
          'coopeuch-migracion-rsadministracionconveniopauta',
          'coopeuch-migracion-rsadministradoridg',
          'coopeuch-migracion-rsagendamientoproductos',
          'coopeuch-migracion-rsahorroautomatico',
          'coopeuch-migracion-rsajustemandatocreditohipotecario',
          'coopeuch-migracion-rsalmacendatos',
          'coopeuch-migracion-rsautenticacion',
          'coopeuch-migracion-rsautenticacioninterna',
          'coopeuch-migracion-rsbanco',
          'coopeuch-migracion-rsbonoescolaridad',
          'coopeuch-migracion-rsbotonpago',
          'coopeuch-migracion-rscajero',
          'coopeuch-migracion-rscalculadora',
          'coopeuch-migracion-rscalcularpmt',
          'coopeuch-migracion-rscalculoscredito',
          'coopeuch-migracion-rscampana',
          'coopeuch-migracion-rscampanaibs',
          'coopeuch-migracion-rscampanamigraciontd',
          'coopeuch-migracion-rscampanawf',
          'coopeuch-migracion-rscarroabandonadowhatsapp',
          'coopeuch-migracion-rscartolaconsumo',
          'coopeuch-migracion-rscatalogosuma',
          'coopeuch-migracion-rscertificado',
          'coopeuch-migracion-rscertificadorenta',
          'coopeuch-migracion-rschequetercero',
          'coopeuch-migracion-rscifrado',
          'coopeuch-migracion-rscifradotef',
          'coopeuch-migracion-rscliente',
          'coopeuch-migracion-rscondicionescomerciales',
          'coopeuch-migracion-rsconstanciadeprepago',
          'coopeuch-migracion-rsconstanciapago',
          'coopeuch-migracion-rsconsultacontrato',
          'coopeuch-migracion-rsconsultatasas',
          'coopeuch-migracion-rscontrato',
          'coopeuch-migracion-rscontroversiadocumento',
          'coopeuch-migracion-rsconvenios',
          'coopeuch-migracion-rscoop',
          'coopeuch-migracion-rscoopeuch',
          'coopeuch-migracion-rscoopeuchpass',
          'coopeuch-migracion-rscoopeuchpassmovil',
          'coopeuch-migracion-rscorredoraseguros',
          'coopeuch-migracion-rscreditohipotecario',
          'coopeuch-migracion-rscreditohipotecariows',
          'coopeuch-migracion-rscreditolisto',
          'coopeuch-migracion-rscreditomype',
          'coopeuch-migracion-rscreditopda',
          'coopeuch-migracion-rscreditoplanillaweb',
          'coopeuch-migracion-rscreditosconsumo',
          'coopeuch-migracion-rscreditoscoring',
          'coopeuch-migracion-rscuentaahorro',
          'coopeuch-migracion-rscuentas',
          'coopeuch-migracion-rscuentavista',
          'coopeuch-migracion-rscuotaparticipacion',
          'coopeuch-migracion-rsdap',
          'coopeuch-migracion-rsdatosdocumentos',
          'coopeuch-migracion-rsdatosfraudecca',
          'coopeuch-migracion-rsdatosgeograficos',
          'coopeuch-migracion-rsdatosmerp',
          'coopeuch-migracion-rsdeposito',
          'coopeuch-migracion-rsdesafio',
          'coopeuch-migracion-rsdesafiosinacofi',
          'coopeuch-migracion-rsdesbloqueotarjetas',
          'coopeuch-migracion-rsdescargadocumento',
          'coopeuch-migracion-rsdestinatario',
          'coopeuch-migracion-rsdestinatariosconvenio',
          'coopeuch-migracion-rsdirecciones',
          'coopeuch-migracion-rsdocportabilidadfinanciera',
          'coopeuch-migracion-rsdocumento',
          'coopeuch-migracion-rseeccnexus',
          'coopeuch-migracion-rsejecutivo',
          'coopeuch-migracion-rsembargo',
          'coopeuch-migracion-rsempresa',
          'coopeuch-migracion-rsencuesta',
          'coopeuch-migracion-rsenrolamiento',
          'coopeuch-migracion-rsenrolamientoabonoremuneraciones',
          'coopeuch-migracion-rsenvioemail',
          'coopeuch-migracion-rsevaluacioncredito',
          'coopeuch-migracion-rsevaluacionpersona',
          'coopeuch-migracion-rsevaluacionsolicitudesweb',
          'coopeuch-migracion-rsfactoresautenticacion',
          'coopeuch-migracion-rsfirmasinacofi',
          'coopeuch-migracion-rsfirmatoc',
          'coopeuch-migracion-rsformalizacionweb',
          'coopeuch-migracion-rsfraude',
          'coopeuch-migracion-rsfuncionario',
          'coopeuch-migracion-rsgestioncredito',
          'coopeuch-migracion-rsgestionnominastef',
          'coopeuch-migracion-rsgestionpagoexpress',
          'coopeuch-migracion-rsgestionpintarjeta',
          'coopeuch-migracion-rsgestiontarjetacredito',
          'coopeuch-migracion-rsgestiontoken',
          'coopeuch-migracion-rsgestorenviopago',
          'coopeuch-migracion-rsindicadoresfinancieros',
          'coopeuch-migracion-rsinfogestioncredito',
          'coopeuch-migracion-rsinfopersona',
          'coopeuch-migracion-rsinfopuntos',
          'coopeuch-migracion-rsinformaciondemografica',
          'coopeuch-migracion-rsinstitucioncompracartera',
          'coopeuch-migracion-rsinversiones',
          'coopeuch-migracion-rsips',
          'coopeuch-migracion-rsldap',
          'coopeuch-migracion-rsliquidacionestalana-ci',
          'coopeuch-migracion-rslistanegra',
          'coopeuch-migracion-rslog',
          'coopeuch-migracion-rslogplataformas',
          'coopeuch-migracion-rsmandatosproductos',
          'coopeuch-migracion-rsmantenedorconvenios',
          'coopeuch-migracion-rsmantenedorcuenta',
          'coopeuch-migracion-rsmantenedordestinatario',
          'coopeuch-migracion-rsmarcadoresfuncionalidades',
          'coopeuch-migracion-rsmediosdepago',
          'coopeuch-migracion-rsmensajesocio',
          'coopeuch-migracion-rsmesavisado',
          'coopeuch-migracion-rsmigracionbonos',
          'coopeuch-migracion-rsminvu',
          'coopeuch-migracion-rsmodeloatencion',
          'coopeuch-migracion-rsmonedero',
          'coopeuch-migracion-rsmonitorprevired',
          'coopeuch-migracion-rsmotorriesgo',
          'coopeuch-migracion-rsmovimientostransferencia',
          'coopeuch-migracion-rsnominastef',
          'coopeuch-migracion-rsnotificacion',
          'coopeuch-migracion-rsnotificaciones',
          'coopeuch-migracion-rsnotificacionmovil',
          'coopeuch-migracion-rsofertassociowf',
          'coopeuch-migracion-rspago',
          'coopeuch-migracion-rspagocuentas',
          'coopeuch-migracion-rspagoexpress',
          'coopeuch-migracion-rspagosqr',
          'coopeuch-migracion-rsparametro',
          'coopeuch-migracion-rsparametroscrm',
          'coopeuch-migracion-rsparametrosenrolamiento',
          'coopeuch-migracion-rsparametrosgenerales',
          'coopeuch-migracion-rspatpass',
          'coopeuch-migracion-rspensionado-ci',
          'coopeuch-migracion-rspensionadosseguros',
          'coopeuch-migracion-rspensionalimentos',
          'coopeuch-migracion-rspersona',
          'coopeuch-migracion-rsplanillaconvenio',
          'coopeuch-migracion-rsplantarifario',
          'coopeuch-migracion-rspoderespecial',
          'coopeuch-migracion-rspolizaseguro',
          'coopeuch-migracion-rsportabilidadfinanciera',
          'coopeuch-migracion-rspostergacioncuotas',
          'coopeuch-migracion-rspostergacioncuotasweb-ci',
          'coopeuch-migracion-rspostulacionvivienda',
          'coopeuch-migracion-rsprecio',
          'coopeuch-migracion-rsprecioi',
          'coopeuch-migracion-rspreciowf',
          'coopeuch-migracion-rsproductos',
          'coopeuch-migracion-rsproductoscredito',
          'coopeuch-migracion-rsproductospasivos',
          'coopeuch-migracion-rspromocion',
          'coopeuch-migracion-rspush',
          'coopeuch-migracion-rsreferido',
          'coopeuch-migracion-rsreglassimulacion',
          'coopeuch-migracion-rsremanente',
          'coopeuch-migracion-rsrepresentantelegal',
          'coopeuch-migracion-rsresumensinacofi',
        ];

        // Verificar blueprints para cada repositorio
        const reposWithBlueprints = repos.map((repo) => {
          const hasBlueprint = blueprintsList.includes(repo.repo_slug);
          return { ...repo, has_blueprint: hasBlueprint };
        });

        setRepositories(reposWithBlueprints);
        setFilteredRepositories(reposWithBlueprints);
      } catch (error) {
        console.error('Error loading repositories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRepositories();
  }, []);

  // Filtrar repositorios
  useEffect(() => {
    let filtered = repositories;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (repo) =>
          repo.repo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repo.repo_slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repo.project_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repo.workspace.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por disponibilidad de blueprint
    if (blueprintFilter !== 'all') {
      filtered = filtered.filter((repo) => {
        if (blueprintFilter === 'available') {
          return repo.has_blueprint;
        } else if (blueprintFilter === 'unavailable') {
          return !repo.has_blueprint;
        }
        return true;
      });
    }

    setFilteredRepositories(filtered);
  }, [repositories, searchTerm, blueprintFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-600">Cargando repositorios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Repositorios Apache Camel
          </h2>
          <p className="text-sm text-gray-500">
            {filteredRepositories.length} de {repositories.length} repositorios
          </p>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-4xl flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar repositorios por nombre, slug o proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center">
          <select
            value={blueprintFilter}
            onChange={(e) =>
              setBlueprintFilter(
                e.target.value as 'all' | 'available' | 'unavailable'
              )
            }
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos</option>
            <option value="available">Disponible</option>
            <option value="unavailable">No disponible</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 rounded-lg flex-1 flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1">
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '30%' }}
                >
                  Repositorio
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '12%' }}
                >
                  Workspace
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '12%' }}
                >
                  Proyecto
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '12%' }}
                >
                  Rama Principal
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '10%' }}
                >
                  Tamaño
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '12%' }}
                >
                  Fecha Creación
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: '12%' }}
                >
                  Blueprint
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRepositories.map((repo, index) => (
                <tr
                  key={`${repo.workspace}-${repo.repo_slug}-${index}`}
                  className={`hover:bg-gray-50 ${
                    repo.has_blueprint ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  onClick={() =>
                    handleRowClick(repo.repo_slug, repo.has_blueprint)
                  }
                >
                  <td className="px-3 py-4" style={{ width: '30%' }}>
                    <div className="flex items-center">
                      <GitBranch className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {repo.repo_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {repo.repo_slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    className="px-3 py-4 whitespace-nowrap"
                    style={{ width: '12%' }}
                  >
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {repo.workspace}
                    </span>
                  </td>
                  <td
                    className="px-3 py-4 whitespace-nowrap"
                    style={{ width: '12%' }}
                  >
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {repo.project_key}
                    </span>
                  </td>
                  <td
                    className="px-3 py-4 whitespace-nowrap"
                    style={{ width: '12%' }}
                  >
                    <span className="text-sm text-gray-900 font-mono">
                      {repo.main_branch}
                    </span>
                  </td>
                  <td
                    className="px-3 py-4 whitespace-nowrap text-sm text-gray-900"
                    style={{ width: '10%' }}
                  >
                    {(repo.size_bytes / 1024 / 1024).toFixed(1)} MB
                  </td>
                  <td
                    className="px-3 py-4 whitespace-nowrap text-sm text-gray-500"
                    style={{ width: '12%' }}
                  >
                    {new Date(repo.created_on).toLocaleDateString('es-ES')}
                  </td>
                  <td
                    className="px-3 py-4 whitespace-nowrap"
                    style={{ width: '12%' }}
                  >
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        repo.has_blueprint
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {repo.has_blueprint ? 'Disponible' : 'No disponible'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {filteredRepositories.length === 0 && (
        <div className="text-center py-8">
          <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500">
            No se encontraron repositorios
          </p>
        </div>
      )}
    </div>
  );
}
