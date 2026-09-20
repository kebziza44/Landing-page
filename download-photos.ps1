$base = 'D:\Sayt loyihalari\landing page Admire'
$urls = @(
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWm2i10j3O_En81ZVwPYApJe6JIv1VIjIJklTkquQkbKQMYPKXoptm5ZKXLUd_9NbI3ORfp7OISkPgoXU1rxEY8cR27h8249dMAH_ecfYwKaR9Q51IyAbiTHhL6BTTKX929YzrlA=w1600-k-no',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmOKOqd0R5DAdcYI1JXL7aU1f1eQV1BJYui-5CMK9UzKP37sVv7BCtecHNXuaA8qDlAGU4azUfJkxas06xdlSwFYrDLDKoEa6cimvZzqrpSlA7olM4qcuH12jM_1SvRuVPbRqM=w1600-k-no',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWl2ez1qzGbHs42K3zRmuj6Z7Qa7wbBzwwdzXzhnU7dFZH4Z3w-huy2UR7ydGFUqaBZH8FnUzQfDNBZo46PbFQoIbZsuHgcV-IQK1OI-COLacTbOOhCUhZIFgVuhTp-WW1DMnfcv=w1600-k-no',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmd9JEe4nOoqdWuF3Z5PrIQQq0F8CEhdrYs8R-hgRe0QGSwu8gW62UWt-jRv9-QvqZ_r64SsOvZZ6RSuOmyyyfnd436UUNc9T4azVPVWvfajhh6TpX8MLuJmFT4BFyYA9hypKWZ=w1600-k-no',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWklY8gH7ajeM3kAWCAcdOjxQhoLjYjvIUajoFK02Z_m7ugz7Nc8Ui4uBRQcCv4paFK3IRUv4Cxbz1JZ2DiOFWefrOmktUjL_-TT1J4drr3hn2mbqxtAeVA55GtMLRbFiECwY_bgwCS7pzM=w1600-k-no',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWk1vmID9ywBZFdoFMpTohdA51eX-MTHkpxw7sGdrXV6cppqNjKtTpgzD9NbnBt_1xZFPLf7VPtrCC6rafxZJgrg7ZSgtRcVaeKeE1t0J2MFZHUNkhXZhFZydFsshD9o3LbEH0FI=w1600-k-no',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWnLjvF1qJCHvjX82BPFy53Lt3wqeX4UMNTKXeWih3c1QXumJk7SQ1ElrRvMmWfS0BSfwKJBAZaU9DNnGkZi9WKKjXIyce1yMnP6QbeWGs9sULc9m7QtFDDOYoigg2fE2F5mfcg=w1600-k-no',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmauEflkaqJ4bii4qLESAZlDS1PjHg66qMUDh4VNfoohP_Tk600GMzCYCDE40UgrRCWa88B6D2aZWfch5Kl3tmXK0qrDpgTVOEwoGGAfBGWyIWwfWA-1xIWvvhnJtZL5ySxk0ebIQ=w1600-k-no',
  'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWleshzGbJdx2ExhSc1YTfg8NKQK8m6IAKkfF2l6jOviKUoCQTsQbXM9x0TZ85iKRgnyqiuzEPaod8DlzwknGDGdqq7kTABBNN3bO809Ub8Lkzkp6xXrK2rx8d5tQ8bowrDASTutig=w1600-k-no'
)
$i = 2
foreach ($u in $urls) {
  $out = Join-Path $base ('assets\img\photos\photo-{0:d2}.jpg' -f $i)
  try {
    Invoke-WebRequest -Uri $u -OutFile $out -UseBasicParsing -TimeoutSec 60
    Write-Output ("OK {0}" -f $i)
  } catch {
    Write-Output ("FAIL {0}: {1}" -f $i, $_.Exception.Message)
  }
  $i++
}
Get-ChildItem (Join-Path $base 'assets\img\photos') | ForEach-Object { '{0}  {1} KB' -f $_.Name, [math]::Round($_.Length/1KB) }
