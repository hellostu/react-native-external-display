import { ConfigPlugin, IOSConfig, BaseMods, withMod } from 'expo/config-plugins'
import fs from 'fs'

/**
 * A plugin which adds new base modifiers to the prebuild config.
 */
export function withAppDelegateBaseMod(config) {
  return (
    BaseMods.withGeneratedBaseMods <
    'appDelegate' >
    (config,
    {
      platform: 'ios',
      providers: {
        // Append a custom rule to supply AppDelegate data to mods on `mods.ios.appDelegate`
        appDelegate:
          BaseMods.provider <
          IOSConfig.Paths.AppDelegateProjectFile >
          {
            // Get the local filepath that should be passed to the `read` method.
            getFilePath({ modRequest: { projectRoot } }) {
              return IOSConfig.Paths.getAppDelegateFilePath(projectRoot)
            },
            // Read the input file from the filesystem.
            async read(filePath) {
              return IOSConfig.Paths.getFileInfo(filePath)
            },
            // Write the resulting output to the filesystem.
            async write(filePath: string, { modResults: { contents } }) {
              // Modify the AppDelegate.m/mm file's contents
              const modifiedContents = modifyAppDelegate(contents)
              await fs.promises.writeFile(filePath, modifiedContents)
            },
          },
      },
    })
  )
}

/**
 * Function to modify the AppDelegate.m/mm file contents.
 */
function modifyAppDelegate(contents) {
  const importStatement = `#import "RNExternalDisplayUtils.h"`

  // Add the import statement if it's not already present
  if (!contents.includes(importStatement)) {
    contents = `${importStatement}\n${contents}`
  }

  const method = `
  - (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options API_AVAILABLE(ios(13.0)) {
    UISceneConfiguration * configuration =
      [RNExternalAppDelegateUtil application:application
        configurationForConnectingSceneSession:connectingSceneSession
        options:options
        sceneOptions:@{
          @"headless": @YES
        }
      ];
    return configuration;
  }
  `

  // Add the method if it's not already present
  if (
    !contents.includes(
      'application:(UIApplication *)application configurationForConnectingSceneSession',
    )
  ) {
    contents = contents.replace('@end', `${method}\n@end`)
  }

  return contents
}

/**
 * (Utility) Provides the AppDelegate file for modification.
 */
export const withAppDelegate: ConfigPlugin<
  Mod<IOSConfig.Paths.AppDelegateProjectFile>,
> = (config, action) => {
  return withMod(config, {
    platform: 'ios',
    mod: 'appDelegate',
    action,
  })
}

// (Example) Log the contents of the AppDelegate mod results.
export const withSimpleAppDelegateMod = (config) => {
  return withAppDelegate(config, (config) => {
    console.log('modify AppDelegate:', config.modResults)
    return config
  })
}

export default withAppDelegateBaseMod
