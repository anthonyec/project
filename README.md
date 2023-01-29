# project
Command line tool to manage my projects

## Usage

`project make <organisation> <project_name> [--workspace]`

`project make misc "Tax returns"` - Creates a project folder starting with todays date, e.g `~/projects/misc/230129_tax_returns`

`project make misc "Tax returns" -w` - Creates a project folder and a workspace folder, e.g `~/projects/misc/230129_tax_returns` and `~/workspace/misc/230129_tax_returns`

```
$ project find --type .blend

---

Projects found with ".blend" files

misc:
  My first blender project    ~/projects/misc/190103_my_first_blender_project
  
```

## project.toml

New projects will contain a `project.toml` file with project information.

```yaml
name = "Tax returns"
workspace = "~/workspace/misc/230129_tax_returns"
created_at = 2023-01-23T07:32:00-08:00
archived = false
```

When a project is no longer use, set the `archived` flag set to `true`. This will highlight a project is no longer active when searching using the CLI.

```
$ project find "tax returns"

---

Projects found for "tax returns"

misc:
  Tax returns (archived)    ~/projects/misc/230129_tax_returns
                            ~/workspace/misc/230129_tax_returns
  
cool_company:
  Tax returns               ~/projects/cool_company/200210_tax_returns 

```

