/**
 * GitHub  https://github.com/tanaikech/CopyFolder<br>
 * <br>
 * copyAllFilesFolders method for CopyFolder.<br>
 * - Copy the folder from the source folder ID to the destination folder ID. In this case, all files and folders in the source folder are copied by keeping the folder structure.<br>
 * @param {Object} object Object for duplicating the all files and folders in a folder.
 * @return {Object} Return Object
 */
function copyAllFilesFolders(object) {
  var fd = new CopyFolder();
  return fd.copyAllFilesFolders(object);
}

/**
 * copyOnlyFiles method for CopyFolder.<br>
 * - Copy the files from the source folder ID to the destination folder ID. In this case, the files just under the source folder are copied. So the folders in the source folder are not copied.<br>
 * @param {Object} object Object for duplicating the files in a folder.
 * @return {Object} Return Object
 */
function copyOnlyFiles(object) {
  var fd = new CopyFolder();
  return fd.copyOnlyFiles(object);
}
;
(function(r) {
  var CopyFolder;
  CopyFolder = (function() {
    var copyGASProjects, doBatch, updateCheck, updateCheckForCopyOnlyFiles;

    class CopyFolder {
      constructor() {
        this.url = "https://www.googleapis.com/drive/v3/files/";
      }

      // ----- begin main methods
      copyAllFilesFolders(obj_) {
        var copiedFiles, files, filesInFolder, filesToFolder, folderIds, folderTree, gasProject, nodupFilesToFolder, srcTree;
        if (!obj_ || !("sourceFolderId" in obj_) || !("destinationFolderId" in obj_)) {
          throw new Error("Object for using this library was not found.");
        }
        if (!("overwrite" in obj_)) {
          obj_.overwrite = false;
        }
        srcTree = updateCheck.call(this, obj_);
        if (!srcTree.files.some((e) => {
          return e.filesInFolder.length > 0;
        })) {
          return {
            message: "Files in the source folder are the same with them in the destination folder.",
            result: "done"
          };
        }
        folderTree = srcTree.files.reduce((o, e) => {
          o.id.push(e.folderTreeById);
          o.name.push(e.folderTreeByName);
          return o;
        }, {
          id: [],
          name: []
        });
        folderIds = JSON.parse(JSON.stringify(folderTree.id)).reduce((o, e) => {
          o[e.pop()] = true;
          return o;
        }, {});
        filesInFolder = JSON.parse(JSON.stringify(srcTree.files)).reduce((o, e) => {
          o[e.folderTreeById.pop()] = e.filesInFolder.filter((f) => {
            return !folderIds.hasOwnProperty(f.id);
          });
          return o;
        }, {});
        filesToFolder = [];
        folderTree.name.forEach((e, i) => {
          filesToFolder[i] = [];
          e.forEach((f, j) => {
            var ff, fol, folders;
            if (folderTree.id[i][j] === obj_.sourceFolderId) {
              filesToFolder[i].push({
                name: "DestinationTopFolder",
                toId: obj_.destinationFolderId,
                files: filesInFolder[folderTree.id[i][j]]
              });
            } else {
              fol = DriveApp.getFolderById(j === 1 ? obj_.destinationFolderId : filesToFolder[i][j - 1].toId);
              folders = fol.getFoldersByName(f);
              if (folders.hasNext()) {
                ff = folders.next();
                filesToFolder[i].push({
                  name: ff.getName(),
                  toId: ff.getId(),
                  files: filesInFolder[folderTree.id[i][j]]
                });
              } else {
                filesToFolder[i].push({
                  name: f,
                  toId: fol.createFolder(f).getId(),
                  files: filesInFolder[folderTree.id[i][j]],
                  overwrite: f.overwrite || false
                });
              }
            }
          });
        });
        nodupFilesToFolder = filesToFolder.reduce((o, e) => {
          e.forEach((f) => {
            if (!o.dupCheck[f.toId]) {
              o.ar.push(f);
              o.dupCheck[f.toId] = true;
            }
          });
          return o;
        }, {
          dupCheck: {},
          ar: []
        });
        gasProject = [];
        files = nodupFilesToFolder.ar.reduce((ar, f) => {
          files = f.files;
          if (files && files.length > 0) {
            files.forEach((g) => {
              if (obj_.overwrite === true) {
                if (g.overwrite === true && g.dstFileId) {
                  ar.push({
                    method: "DELETE",
                    endpoint: `${this.url}${g.dstFileId}?supportsAllDrives=true`
                  });
                }
                if (g.mimeType === "application/vnd.google-apps.script") {
                  gasProject.push({
                    name: g.name,
                    id: g.id,
                    toId: f.toId
                  });
                } else {
                  ar.push({
                    method: "POST",
                    endpoint: `${this.url}${g.id}/copy?supportsAllDrives=true`,
                    requestBody: {
                      name: g.name,
                      parents: [f.toId]
                    }
                  });
                }
              } else {
                if (!g.overwrite) {
                  if (g.mimeType === "application/vnd.google-apps.script") {
                    gasProject.push({
                      name: g.name,
                      id: g.id,
                      toId: f.toId
                    });
                  } else {
                    ar.push({
                      method: "POST",
                      endpoint: `${this.url}${g.id}/copy?supportsAllDrives=true`,
                      requestBody: {
                        name: g.name,
                        parents: [f.toId]
                      }
                    });
                  }
                }
              }
            });
          }
          return ar;
        }, []);
        doBatch.call(this, files);
        if (gasProject.length > 0) {
          copyGASProjects.call(this, gasProject);
        }
        copiedFiles = nodupFilesToFolder.ar.reduce((ar, e) => {
          e.files.forEach((f) => {
            if (!f.overwrite || (obj_.overwrite && f.overwrite)) {
              ar.push({
                name: f.name,
                id: f.id
              });
            }
          });
          return ar;
        }, []);
        return {
          numberOfCopiedFiles: copiedFiles.length,
          copiedFIles: copiedFiles,
          message: "Files were copied.",
          result: "done"
        };
      }

      copyOnlyFiles(obj_) {
        var copiedFiles, files, gasProject, res, srcFiles;
        if (!obj_ || !("sourceFolderId" in obj_) || !("destinationFolderId" in obj_)) {
          throw new Error("Object for using this library was not found.");
        }
        if (!("overwrite" in obj_)) {
          obj_.overwrite = false;
        }
        srcFiles = updateCheckForCopyOnlyFiles.call(this, obj_);
        if (srcFiles.length === 0) {
          return {
            message: "Files in the source folder are the same with them in the destination folder.",
            result: "done"
          };
        }
        gasProject = [];
        files = srcFiles.reduce((ar, f) => {
          if (obj_.overwrite === true) {
            if (f.overwrite === true && f.dstFileId) {
              ar.push({
                method: "DELETE",
                endpoint: `${this.url}${f.dstFileId}?supportsAllDrives=true`
              });
            }
            if (f.mimeType === "application/vnd.google-apps.script") {
              gasProject.push({
                name: f.name,
                id: f.id,
                toId: obj_.destinationFolderId
              });
            } else {
              ar.push({
                method: "POST",
                endpoint: `${this.url}${f.id}/copy?supportsAllDrives=true`,
                requestBody: {
                  name: f.name,
                  parents: [obj_.destinationFolderId]
                }
              });
            }
          } else {
            if (!f.overwrite) {
              if (f.mimeType === "application/vnd.google-apps.script") {
                gasProject.push({
                  name: f.name,
                  id: f.id,
                  toId: obj_.destinationFolderId
                });
              } else {
                ar.push({
                  method: "POST",
                  endpoint: `${this.url}${f.id}/copy?supportsAllDrives=true`,
                  requestBody: {
                    name: f.name,
                    parents: [obj_.destinationFolderId]
                  }
                });
              }
            }
          }
          return ar;
        }, []);
        res = doBatch.call(this, files);
        if (gasProject.length > 0) {
          copyGASProjects.call(this, gasProject);
        }
        copiedFiles = srcFiles.reduce((ar, f) => {
          if (!f.overwrite || (obj_.overwrite && f.overwrite)) {
            ar.push({
              name: f.name,
              id: f.id
            });
          }
          return ar;
        }, []);
        return {
          numberOfCopiedFiles: copiedFiles.length,
          copiedFIles: copiedFiles,
          message: "Files were copied.",
          result: "done"
        };
      }

    };

    CopyFolder.name = "CopyFolder";

    // ----- end main methods

    // ----- Tool
    copyGASProjects = function(gasProject) {
      var batchCopy, copiedGas, gasFiles, moveFiles;
      gasFiles = gasProject.map((g) => {
        return {
          method: "POST",
          endpoint: `${this.url}${g.id}/copy?supportsAllDrives=true`,
          requestBody: {
            name: g.name,
            parents: [g.toId]
          }
        };
      });
      batchCopy = doBatch.call(this, gasFiles);
      copiedGas = batchCopy.reduce((ar, r) => {
        r.match(/{[\s\S]+?}/g).forEach((e) => {
          var er, temp;
          try {
            temp = JSON.parse(e);
            ar.push(temp);
          } catch (error) {
            er = error;
            throw new Error(e);
          }
        });
        return ar;
      }, []);
      moveFiles = gasProject.map((g, i) => {
        return {
          method: "PATCH",
          endpoint: `${this.url}${copiedGas[i].id}?supportsAllDrives=true&removeParents=root&addParents=${g.toId}`,
          requestBody: {}
        };
      });
      return doBatch.call(this, moveFiles);
    };

    updateCheckForCopyOnlyFiles = function(obj_) {
      var dstFiles, dstObj, srcFiles;
      srcFiles = FilesApp.getFilesAndFoldersInFolder(obj_.sourceFolderId, null, "files(name,id,mimeType,modifiedTime)").filter((f) => {
        return f.mimeType !== "application/vnd.google-apps.folder";
      });
      dstFiles = FilesApp.getFilesAndFoldersInFolder(obj_.destinationFolderId, null, "files(name,id,mimeType,modifiedTime)").filter((f) => {
        return f.mimeType !== "application/vnd.google-apps.folder";
      });
      if (dstFiles.length === 0) {
        return srcFiles;
      }
      dstObj = dstFiles.reduce((o, e) => {
        e.modifiedTime = new Date(e.modifiedTime).getTime();
        return Object.assign(o, {
          [e.name + "_" + e.mimeType]: e
        });
      }, {});
      return srcFiles.reduce((ar, e) => {
        var key;
        key = e.name + "_" + e.mimeType;
        if (key in dstObj && new Date(e.modifiedTime).getTime() > dstObj[key].modifiedTime) {
          e.dstFileId = dstObj[key].id;
          e.overwrite = true;
          ar.push(e);
        } else if (!(key in dstObj)) {
          ar.push(e);
        }
        return ar;
      }, []);
    };

    updateCheck = function(obj_) {
      var delimiter, dstObj, dstTree, srcTree, topFolderName;
      dstTree = FilesApp.createTree(obj_.destinationFolderId, null, "files(name,id,mimeType,modifiedTime)");
      srcTree = FilesApp.createTree(obj_.sourceFolderId, null, "files(name,id,mimeType,modifiedTime)");
      if (!dstTree.hasOwnProperty("files")) {
        return srcTree;
      }
      delimiter = "A#B#C#D#E";
      topFolderName = "X#Y#Z#topFolder#Z#Y#X";
      dstObj = dstTree.files.reduce((o, e) => {
        var folKey;
        if (e.filesInFolder.length > 0) {
          folKey = "";
          if (e.folderTreeById[0] === obj_.destinationFolderId) {
            e.folderTreeByName[0] = topFolderName;
            folKey = e.folderTreeByName.join(delimiter);
          } else {
            throw new Error("Invalid top folder for the destination folder.");
          }
          o[folKey] = e.filesInFolder.map((f) => {
            f.modifiedTime = new Date(f.modifiedTime).getTime();
            return f;
          });
        }
        return o;
      }, {});
      srcTree.files.forEach((e, i) => {
        var folKey;
        if (e.filesInFolder.length > 0) {
          folKey = "";
          if (e.folderTreeById[0] === obj_.sourceFolderId) {
            e.folderTreeByName[0] = topFolderName;
            folKey = e.folderTreeByName.join(delimiter);
          } else {
            throw new Error("Invalid top folder for the source folder.");
          }
          if (dstObj[folKey]) {
            srcTree.files[i].filesInFolder = e.filesInFolder.reduce((ar, f) => {
              var ff;
              if (dstObj[folKey].some((g) => {
                return f.name === g.name && new Date(f.modifiedTime).getTime() > g.modifiedTime;
              })) {
                ff = (dstObj[folKey].filter((g) => {
                  return f.name === g.name;
                }))[0];
                f.dstFileId = ff.id;
                f.overwrite = true;
                ar.push(f);
              } else if (!dstObj[folKey].some((g) => {
                return f.name === g.name;
              })) {
                ar.push(f);
              }
              return ar;
            }, []);
          } else {
            srcTree.files[i].filesInFolder = e.filesInFolder;
          }
        }
      });
      return srcTree;
    };

    doBatch = function(files_) {
      var i, k, limit, ref, requests, res, result, split;
      limit = 100;
      split = Math.ceil(files_.length / limit);
      res = [];
      for (i = k = 0, ref = split; (0 <= ref ? k < ref : k > ref); i = 0 <= ref ? ++k : --k) {
        requests = {
          batchPath: "batch/drive/v3",
          requests: files_.splice(0, limit)
        };
        result = BatchRequest.Do(requests);
        res.push(result.getContentText());
      }
      return res;
    };

    return CopyFolder;

  }).call(this);
  return r.CopyFolder = CopyFolder;
})(this);
