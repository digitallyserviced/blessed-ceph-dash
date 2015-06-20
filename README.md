# blessed-ceph-dash
ceph dashboard using blessed-contrib

**Please note as of this time the dashboard only works with my `master` branch of [blessed-contrib](https://github.com/xcezzz/blessed-contrib). The package.json reflects this now.**


![Image of blessed-ceph-dash](./screenshot.png)

The dashboard uses an express route so that you can post the output of `ceph status -f json` to it.

Adding more features and customizability soon.

Since my Ceph cluster is on a private network and inaccessible from dev machines. The Ceph cluster POSTs data outbound to port 3004 (default port used in this).

###Installation
```bash
npm install blessed-ceph-dash
```

####Usage

```bash
Display statistics for the Ceph storage platform.
Usage: ceph-dash [options]

Options:
  -l, --local   Local Mode: Gather statistics if running locally to Ceph.
                Expects 'ceph' in path and authenticated. [DEFAULT]
  -r, --remote  SSH Mode: Gather statistics from specified Ceph admin machine
                via SSH. e.g --remote=servername.com
  -n, --noauto  NoAuto Mode: Do not gather statistics automatically. Used for
                when you will manually POST data to ceph-dash
  -u, --user    User for SSH authentication to Ceph admin machine
                                                               [default: "root"]
  --password    Password for SSH authentication to Ceph admin machine (NOT
                RECOMMENDED)
  -k, --key     SSH key file. (Default: ~/.ssh/id_rsa and ~/.ssh/id_dsa)
  -p, --port    Port to connect with SSH.                          [default: 22]
  -b, --bind    Port to listen on for 'ceph health -fjson' to be POSTd to.
                                                                 [default: 3004]
  -h, --help    Show usage message.
```

####On a machine that can access the Ceph cluster
```bash
ceph-dash
```

####On a machine that can SSH to the Ceph cluster
```bash
ceph-dash --remote=someserver.com --port 22 --key .ssh/id_rsa
```
You could also specify `--password=PASSWORD` but obviously this is probably not a good idea as your password will now leak out.

####On a machine will run the dashboard
```bash
ceph-dash --noauto --bind 1234
```

Then from inside your Ceph network you will POST the output of `ceph status -f json` to the machine you are running the dashboard.

```bash
while true; do 
    ceph status -f json | curl -X POST \
    	-H "Content-type: application/json" \
    	-d @- http://remotehost:1234/; 
    sleep 2; 
done
```