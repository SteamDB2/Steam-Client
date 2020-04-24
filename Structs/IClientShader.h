class IClientShader
{
public:
    virtual unknown_ret BIsShaderManagementEnabled() = 0;
    virtual unknown_ret EnableShaderManagement(bool) = 0;
    virtual unknown_ret GetShaderDepotsTotalDiskUsage() = 0;
    virtual unknown_ret StartShaderScan(unsigned int, char const*) = 0;
    virtual unknown_ret StartPipelineBuild(unsigned int, int) = 0;
    virtual unknown_ret ProcessShaderCache(unsigned int) = 0;
    virtual unknown_ret SetupShaderCacheEnvironment(char*, unsigned int) = 0;
    virtual unknown_ret BAppHasPendingShaderContentDownload(unsigned int) = 0;
    virtual unknown_ret GetAppPendingShaderDownloadSize(unsigned int) = 0;
};
